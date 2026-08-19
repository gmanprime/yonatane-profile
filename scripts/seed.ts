import * as fs from 'fs';
import * as path from 'path';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq, and } from 'drizzle-orm';
import * as schema from '../src/lib/db/schema';
import { SYSTEM_DEFAULT_THEME_CONFIG } from '../src/lib/services/theme.service';

function loadEnv() {
  const envPaths = [path.resolve(process.cwd(), '.env.local'), path.resolve(process.cwd(), '.env')];
  for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
      const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx !== -1) {
          const key = trimmed.slice(0, eqIdx).trim();
          let val = trimmed.slice(eqIdx + 1).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      }
    }
  }
}

loadEnv();

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:5432/postgres';
const client = postgres(connectionString, { max: 1 });
const db = drizzle(client, { schema });

async function seed() {
  console.log('🌱 [SEED] Starting Database Seeding & Production Data Integration...');

  // 1. Resolve CV JSON file
  let cvPath = path.resolve(process.cwd(), 'yonatan-elias-cv-16-08-2026.json');
  if (!fs.existsSync(cvPath)) {
    cvPath = path.resolve(process.cwd(), 'public/sample-cv.json');
  }

  if (!fs.existsSync(cvPath)) {
    throw new Error('CV source JSON file not found at yonatan-elias-cv-16-08-2026.json or public/sample-cv.json');
  }

  console.log(`📖 [SEED] Reading CV data from ${cvPath}...`);
  const rawJson = JSON.parse(fs.readFileSync(cvPath, 'utf-8'));

  // 2. Ensure Primary User exists
  const adminEmail = 'yonatane504@gmail.com';
  console.log(`👤 [SEED] Syncing user ${adminEmail}...`);

  let [user] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, adminEmail))
    .limit(1);

  if (!user) {
    [user] = await db
      .insert(schema.users)
      .values({
        email: adminEmail,
        displayName: 'Yonatan Elias',
        supabaseAuthId: 'seed-user-yonatan',
      })
      .returning();
    console.log(`✅ [SEED] Created user: ${user.displayName} (${user.id})`);
  } else {
    console.log(`ℹ️  [SEED] Existing user found: ${user.displayName} (${user.id})`);
  }

  // 3. Clean existing seed dataset if re-running
  const datasetName = 'Yonatan Elias — Master CV (Aug 2026)';
  const existingDatasets = await db
    .select()
    .from(schema.contentDatasets)
    .where(and(eq(schema.contentDatasets.userId, user.id), eq(schema.contentDatasets.name, datasetName)));

  for (const d of existingDatasets) {
    console.log(`🧹 [SEED] Cleaning existing dataset: ${d.name} (${d.id})`);
    await db.delete(schema.contentDatasets).where(eq(schema.contentDatasets.id, d.id));
  }

  // 4. Create Content Dataset
  const basics = (rawJson.basics || {}) as Record<string, unknown>;
  const summary = rawJson.summary?.content || '';
  const picture = (rawJson.picture || {}) as Record<string, unknown>;

  const [dataset] = await db
    .insert(schema.contentDatasets)
    .values({
      userId: user.id,
      name: datasetName,
      rawJson,
      basics,
      summary,
      picture,
    })
    .returning();

  console.log(`✅ [SEED] Created content dataset: ${dataset.name} (${dataset.id})`);

  // 5. Populate Sections and Section Items
  const sectionDict = rawJson.sections || {};
  const sectionKeys = Object.keys(sectionDict);
  const createdSectionsMap = new Map<string, typeof schema.sections.$inferSelect>();
  const createdItemsMap = new Map<string, typeof schema.sectionItems.$inferSelect[]>();

  let displayOrder = 0;
  for (const key of sectionKeys) {
    const sec = sectionDict[key];
    if (!sec) continue;

    const [createdSection] = await db
      .insert(schema.sections)
      .values({
        contentDatasetId: dataset.id,
        type: key,
        title: sec.title || key.charAt(0).toUpperCase() + key.slice(1),
        icon: sec.icon || '',
        columns: sec.columns ?? 1,
        hidden: sec.hidden ?? false,
        displayOrder: displayOrder++,
      })
      .returning();

    createdSectionsMap.set(key, createdSection);

    const rawItems = sec.items || [];
    const insertedItems: typeof schema.sectionItems.$inferSelect[] = [];

    for (let itemIdx = 0; itemIdx < rawItems.length; itemIdx++) {
      const rawItem = rawItems[itemIdx];
      const [item] = await db
        .insert(schema.sectionItems)
        .values({
          sectionId: createdSection.id,
          data: rawItem as Record<string, unknown>,
          hidden: rawItem.hidden ?? false,
          displayOrder: itemIdx,
        })
        .returning();
      insertedItems.push(item);
    }

    createdItemsMap.set(key, insertedItems);
    console.log(`  ↳ Inserted section: ${createdSection.title} (${insertedItems.length} items)`);
  }

  // 6. Seed Themes
  console.log('🎨 [SEED] Seeding theme configurations...');
  const themeConfigs = [
    {
      name: 'Obsidian Minimalist',
      isDefault: true,
      config: SYSTEM_DEFAULT_THEME_CONFIG,
    },
    {
      name: 'Cyber Indigo',
      isDefault: false,
      config: {
        ...SYSTEM_DEFAULT_THEME_CONFIG,
        colors: {
          primary: '#06b6d4',
          secondary: '#6366f1',
          background: '#030712',
          surface: '#0f172a',
          text: '#f8fafc',
          accent: '#10b981',
          muted: '#94a3b8',
          border: '#1e293b',
        },
      },
    },
    {
      name: 'Solaris Minimal Light',
      isDefault: false,
      config: {
        ...SYSTEM_DEFAULT_THEME_CONFIG,
        colors: {
          primary: '#4f46e5',
          secondary: '#7c3aed',
          background: '#f8fafc',
          surface: '#ffffff',
          text: '#0f172a',
          accent: '#0284c7',
          muted: '#64748b',
          border: '#e2e8f0',
        },
      },
    },
  ];

  const createdThemes: typeof schema.themes.$inferSelect[] = [];
  for (const t of themeConfigs) {
    const existing = await db
      .select()
      .from(schema.themes)
      .where(and(eq(schema.themes.userId, user.id), eq(schema.themes.name, t.name)))
      .limit(1);

    if (existing.length > 0) {
      const [updated] = await db
        .update(schema.themes)
        .set({ isDefault: t.isDefault, config: t.config, updatedAt: new Date() })
        .where(eq(schema.themes.id, existing[0].id))
        .returning();
      createdThemes.push(updated);
      console.log(`  ↳ Updated theme: ${updated.name}`);
    } else {
      const [inserted] = await db
        .insert(schema.themes)
        .values({
          userId: user.id,
          name: t.name,
          isDefault: t.isDefault,
          config: t.config,
        })
        .returning();
      createdThemes.push(inserted);
      console.log(`  ↳ Created theme: ${inserted.name}`);
    }
  }

  const defaultTheme = createdThemes.find((t) => t.isDefault) || createdThemes[0];
  const cyberTheme = createdThemes.find((t) => t.name === 'Cyber Indigo') || defaultTheme;

  // 7. Seed Stealth Profiles
  console.log('🚀 [SEED] Seeding stealth profiles...');
  const profileDefinitions = [
    {
      name: 'Master Profile (Default)',
      description: 'Comprehensive public portfolio with all academic, engineering, and project milestones.',
      hash: 'default',
      isDefault: true,
      themeId: defaultTheme.id,
      includedSectionTypes: sectionKeys,
      selectedItemsFilter: () => null,
    },
    {
      name: 'Deep Learning & AI Research',
      description: 'Tailored for Machine Learning Research, Neural Network Architecture, and Computer Vision.',
      hash: 'ai-deep',
      isDefault: false,
      themeId: cyberTheme.id,
      includedSectionTypes: ['profiles', 'experience', 'education', 'skills', 'projects', 'certifications'],
      selectedItemsFilter: (secType: string, items: typeof schema.sectionItems.$inferSelect[]) => {
        if (secType === 'projects') {
          return items
            .filter((i) => {
              const name = (i.data as any)?.name || '';
              return name.includes('U-Net') || name.includes('Mesh Sync') || name.includes('Home Server');
            })
            .map((i) => i.id);
        }
        if (secType === 'experience') {
          return items
            .filter((i) => {
              const comp = (i.data as any)?.company || '';
              return comp.includes('Institute of Geophysics') || comp.includes('iCog Labs');
            })
            .map((i) => i.id);
        }
        return null;
      },
    },
    {
      name: 'Systems & GIS Engineering Focus',
      description: 'Curated for Geospatial Data Engineering, Systems Architecture, and Infrastructure.',
      hash: 'gis-sys',
      isDefault: false,
      themeId: defaultTheme.id,
      includedSectionTypes: ['profiles', 'experience', 'education', 'skills', 'projects', 'awards', 'languages'],
      selectedItemsFilter: (secType: string, items: typeof schema.sectionItems.$inferSelect[]) => {
        if (secType === 'projects') {
          return items
            .filter((i) => {
              const name = (i.data as any)?.name || '';
              return name.includes('Obsidian') || name.includes('Home Server') || name.includes('Induction');
            })
            .map((i) => i.id);
        }
        if (secType === 'experience') {
          return items
            .filter((i) => {
              const comp = (i.data as any)?.company || '';
              return comp.includes('MIYA WATER') || comp.includes('Institute of Geophysics');
            })
            .map((i) => i.id);
        }
        return null;
      },
    },
  ];

  for (const pDef of profileDefinitions) {
    const existingProfiles = await db
      .select()
      .from(schema.profiles)
      .where(and(eq(schema.profiles.userId, user.id), eq(schema.profiles.hash, pDef.hash)));

    for (const ep of existingProfiles) {
      await db.delete(schema.profiles).where(eq(schema.profiles.id, ep.id));
    }

    const [profile] = await db
      .insert(schema.profiles)
      .values({
        userId: user.id,
        name: pDef.name,
        description: pDef.description,
        hash: pDef.hash,
        isDefault: pDef.isDefault,
        contentDatasetId: dataset.id,
        themeId: pDef.themeId,
      })
      .returning();

    console.log(`  ↳ Created profile: ${profile.name} (/p/${profile.hash})`);

    let pOrder = 0;
    for (const secType of pDef.includedSectionTypes) {
      const sec = createdSectionsMap.get(secType);
      if (!sec) continue;

      const items = createdItemsMap.get(secType) || [];
      const selectedItemIds = pDef.selectedItemsFilter(secType, items);

      await db.insert(schema.profileSections).values({
        profileId: profile.id,
        sectionId: sec.id,
        visible: true,
        selectedItemIds: selectedItemIds,
        displayOrder: pOrder++,
      });
    }
  }

  // 8. Seed Portfolio Blog Articles
  console.log('📝 [SEED] Seeding starter portfolio blog articles...');

  const projectItems = createdItemsMap.get('projects') || [];
  const unetProjectItem = projectItems.find((p) => (((p.data as any)?.name || '').includes('U-Net')));
  const meshSyncProjectItem = projectItems.find((p) => (((p.data as any)?.name || '').includes('Obsidian')));
  const inductionProjectItem = projectItems.find((p) => (((p.data as any)?.name || '').includes('Induction')));
  const homeServerProjectItem = projectItems.find((p) => (((p.data as any)?.name || '').includes('Home Server')));

  const portfolioArticles = [
    {
      title: 'Deep Learning Temperature Super-Resolution: U-Net GAN Architecture',
      subtitle: 'Synthesizing fine-grained urban temperature fields using deep adversarial architectures and physics-guided loss formulations.',
      projectItemId: unetProjectItem?.id || null,
      coverImageUrl: 'https://images.unsplash.com/photo-1507413245164-6160d8298b31?auto=format&fit=crop&w=1600&q=80',
      tags: ['Deep Learning', 'PyTorch', 'GANs', 'Computer Vision', 'GIS', 'Urban Climate'],
      links: [
        { label: 'GitHub Repository', url: 'https://github.com/gmanprime' },
        { label: 'Addis Ababa University', url: 'https://www.aau.edu.et' },
      ],
      markdownBody: `## Executive Summary & Research Motivation

Urban microclimates exhibit intense thermal heterogeneity driven by uneven distributions of impervious surfaces, building geometries, and vegetation cover—commonly known as the **Urban Heat Island (UHI)** effect. Traditional coarse satellite thermal sensors (e.g., MODIS at 1 km resolution) lack the spatial granularity required for street-level urban climate interventions, while fine-resolution platforms suffer from long revisit periods.

This research formulates thermal downscaling as an image-to-image translation task utilizing a custom **Generative Adversarial Network (U-Net GAN)** trained on high-dimensional multi-spectral and topographical covariates.

\`\`\`
+---------------------+      +------------------------+      +-----------------------+
| Coarse Temperature  | ---> |   U-Net Generator      | ---> | Super-Resolved Field  |
| + Spatial Covariates|      | (Encoder-Decoder/Skips)|      | (High-Fidelity 30m)   |
+---------------------+      +------------------------+      +-----------------------+
                                        |                                |
                                        v                                v
                             +------------------------+      +-----------------------+
                             | Discriminator (Patch)  | <--- | Ground Truth Thermal  |
                             +------------------------+      +-----------------------+
\`\`\`

---

## Network Architecture & Mathematical Formulation

### 1. Generator ($G$)
The generator implements a symmetric **U-Net** topology with 8 downsampling and 8 upsampling stages. Feature channels scale exponentially from 64 to 512 with spectral normalization applied across convolutional layers to prevent gradient explosion:

$$G: \\{X_{coarse}, X_{covariates}\\} \\rightarrow \\hat{Y}_{fine}$$

Concatenated skip connections transfer high-frequency spatial gradients directly across corresponding resolution scales:

$$x_{up}^{(i)} = \\text{ReLU}\\left(\\text{ConvTranspose2d}\\left(x_{up}^{(i-1)}\\right) \\parallel x_{down}^{(n-i)}\\right)$$

### 2. Multi-Component Loss Objective
To balance structural sharpness with strict physical fidelity, the objective function combines adversarial loss, $\\mathcal{L}_{1}$ pixel-wise penalization, and spatial gradient regularizers:

$$\\mathcal{L}_{total} = \\mathcal{L}_{adv}(G, D) + \\lambda_{1} \\mathcal{L}_{L1}(G) + \\lambda_{2} \\mathcal{L}_{TV}(\\hat{Y})$$

Where the adversarial loss employs least-squares GAN (LSGAN) stabilization:

$$\\mathcal{L}_{adv}(G, D) = \\frac{1}{2} \\mathbb{E}_{x} \\left[\\left(D(G(x)) - 1\\right)^2\\right]$$

---

## Experimental Results & Benchmark Evaluation

Training was conducted on an isolated workstation with NVIDIA CUDA acceleration over 200 epochs using the Adam optimizer ($\\beta_1 = 0.5, \\beta_2 = 0.999$, lr $= 2 \\times 10^{-4}$).

| Method / Baseline | PSNR (dB) ↑ | SSIM ↑ | MAE (°C) ↓ | RMSE (°C) ↓ |
| :--- | :--- | :--- | :--- | :--- |
| Bicubic Interpolation | 24.12 | 0.742 | 1.84 | 2.31 |
| Random Forest Regressor | 27.45 | 0.819 | 1.28 | 1.62 |
| Standard SRCNN | 29.10 | 0.864 | 1.05 | 1.34 |
| **Proposed U-Net GAN** | **33.82** | **0.938** | **0.58** | **0.79** |

---

## Practical Deployment & GIS Ingress

The resulting model was integrated into a GIS pipeline to generate 30-meter continuous surface temperature maps for Addis Ababa, pinpointing critical heat vulnerability zones and informing municipal green infrastructure planning.`,
    },
    {
      title: 'Designing a Peer-to-Peer Mesh Sync Engine for Obsidian Vaults',
      subtitle: 'Decentralized state synchronization across mobile and desktop nodes using Tailscale tunnels and differential patching.',
      projectItemId: meshSyncProjectItem?.id || null,
      coverImageUrl: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1600&q=80',
      tags: ['Obsidian', 'TypeScript', 'Tailscale', 'Distributed Systems', 'P2P', 'Data Sync'],
      links: [
        { label: 'GitHub Repository', url: 'https://github.com/gmanprime/obsidian-mesh-sync' },
      ],
      markdownBody: `## Motivation & Architectural Challenge

Knowledge workers and software engineers increasingly rely on local-first Markdown editors like **Obsidian**. While cloud-based synchronization services exist, they often introduce vendor lock-in, proprietary encrypted backends, or recurring subscription fees.

**Obsidian Mesh Sync** is an open-source peer-to-peer sync engine engineered to synchronize notes, attachments, and workspace workspaces seamlessly across heterogeneous platforms (macOS, Linux, Windows, Android, iOS) without central cloud intermediaries.

---

## Core Engineering Pillars

### 1. Hybrid Transport Topology
- **Local LAN Discovery:** Multicast DNS (mDNS) and UDP broadcast for zero-latency local transfers.
- **WireGuard VPN Mesh (Tailscale):** Encrypted overlay network enabling secure out-of-band sync across remote networks without port forwarding or public IP exposure.

\`\`\`
       +-----------------------+
       |   Desktop Workstation  |
       |  (Arch Linux / NVMe)  |
       +-----------+-----------+
                   ^
                   |  (Tailscale WireGuard / E2EE)
                   v
       +-----------+-----------+
       |   Mobile Android Node |
       +-----------+-----------+
                   ^
                   |  (mDNS Local Mesh)
                   v
       +-----------+-----------+
       |  Secondary Laptop     |
       +-----------------------+
\`\`\`

---

## Conflict Resolution & Delta Engine

To eliminate file corruption and preserve historical versions:

1. **Content-Addressable Chunking:** Files are split into deterministic 64KB blocks hashed with BLAKE3.
2. **Three-Way Merge Algorithm:** When simultaneous edits occur, the engine calculates the Lowest Common Ancestor (LCA) in the commit DAG and performs automatic structural merges.
3. **Conflict Tombstones:** Unresolvable text conflicts generate non-destructive conflict branches with side-by-side visual diffs.

---

## Performance & Security Highlights

- **Sub-100ms Sync Latency** over local Wi-Fi networks.
- **Zero Third-Party Storage:** All data stays on user-owned physical hardware.
- **Automated Snapshots:** Rolling zstd-compressed atomic backups to protect against user error.`,
    },
    {
      title: 'Automating Enterprise GIS Pipelines: From Ingress to Spatial Analytics',
      subtitle: 'Building high-throughput spatial extraction pipelines, Oracle spatial queries, and automated mapping workflows.',
      projectItemId: homeServerProjectItem?.id || null,
      coverImageUrl: 'https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=1600&q=80',
      tags: ['GIS', 'Python', 'Oracle Spatial', 'ETL Automation', 'PostGIS', 'Data Engineering'],
      links: [
        { label: 'MIYA Water Project', url: 'https://miya-water.com/' },
      ],
      markdownBody: `## Project Context & Operational Bottlenecks

Municipal utility mapping and water infrastructure management require accurate geospatial databases containing hundreds of thousands of pipeline segments, valves, meters, and pressure zones.

Prior to automation, GIS operators spent weeks manually extracting coordinates from satellite raster layers, rectifying projection mismatches, and performing manual data entry into Oracle OS GIS instances.

---

## Pipeline Architecture

We engineered a resilient Python ETL automation suite combining **GDAL/OGR**, **GeoPandas**, and **cx_Oracle** to automate the end-to-end data lifecycle:

\`\`\`
+-----------------------+      +---------------------------+      +------------------------+
| Google Maps & Rasters | ---> | Ingress & Feature Extract | ---> | Coordinate Projection  |
| (Raw Imagery / CAD)   |      | (Polygon & Vectorization) |      | (EPSG:4326 -> UTM 37N) |
+-----------------------+      +---------------------------+      +------------------------+
                                                                             |
                                                                             v
+-----------------------+      +---------------------------+      +------------------------+
| Automated Map Reports | <--- | Spatial Topology Validate | <--- | Oracle Spatial Database|
| (QGIS Batch Exporter) |      | (Snapping & Intersects)   |      | (SDO_GEOMETRY Index)   |
+-----------------------+      +---------------------------+      +------------------------+
\`\`\`

---

## Key Technical Outcomes

- **95% Reduction in Turnaround Time:** Batch processing pipelines reduced manual GIS data cleaning workflows from 3 weeks to under 4 minutes.
- **Automated Topology Snapping:** Eliminated dangling nodes and disconnected network loops using custom geometric tolerances.
- **Spatial Indexing Performance:** Implemented Oracle R-Tree spatial indexes (\`SDO_INDEX_METHOD\`), accelerating spatial bounding box queries by over 800%.`,
    },
    {
      title: 'Microcontroller-Based Induction Heating & Power Electronics Control',
      subtitle: 'Closed-loop resonant inverter control, zero-voltage switching (ZVS), and embedded firmware engineering.',
      projectItemId: inductionProjectItem?.id || null,
      coverImageUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1600&q=80',
      tags: ['Embedded Systems', 'Control Theory', 'C/C++', 'Power Electronics', 'Hardware'],
      links: [
        { label: 'AAiT AAU Homepage', url: 'https://aait.edu.et' },
      ],
      markdownBody: `## Engineering Objective & Core Concept

Induction heating leverages electromagnetic induction and Joule heating to achieve high thermal efficiency without direct flame or resistive heating elements.

This project encompassed the full engineering lifecycle—from high-voltage circuit schematic design and PCB layout to embedded C firmware for dynamic frequency control.

---

## Circuit Topology & Power Stage

The power stage comprises a **Quasi-Resonant Zero-Voltage Switching (ZVS) Inverter** driving a high-current work coil in parallel with high-Q polypropylene resonant capacitors:

\`\`\`
AC Mains (220V/50Hz) ---> Full Bridge Rectifier ---> LC Filter (300V DC Bus)
                                                             |
                                                             v
Microcontroller (PWM) ---> Isolated Gate Driver ---> High-Power IGBT (60A/1200V)
                                                             |
                                                             v
                                                  Work Coil || Resonant Cap (Tank)
\`\`\`

---

## Firmware Control Loops & Safety Systems

1. **Zero-Crossing Detection:** Dynamic phase-locked loop (PLL) tracking the resonant frequency (20 kHz - 35 kHz) as cookware impedance shifts.
2. **Pulse-Width Modulation (PWM):** Modulating power output between 200W and 2200W.
3. **Safety Interlocks:** Real-time over-current protection (shunts + comparators), IGBT over-temperature shutdown via NTC thermistor feedback, and pan-presence detection.`,
    },
  ];

  const existingArticles = await db
    .select()
    .from(schema.portfolioItems)
    .where(eq(schema.portfolioItems.userId, user.id));

  for (const art of existingArticles) {
    await db.delete(schema.portfolioItems).where(eq(schema.portfolioItems.id, art.id));
  }

  for (const art of portfolioArticles) {
    const [createdArticle] = await db
      .insert(schema.portfolioItems)
      .values({
        userId: user.id,
        title: art.title,
        subtitle: art.subtitle,
        projectItemId: art.projectItemId,
        coverImageUrl: art.coverImageUrl,
        tags: art.tags,
        links: art.links,
        markdownBody: art.markdownBody,
        status: 'published',
        publishedAt: new Date(),
      })
      .returning();

    console.log(`  ↳ Created portfolio article: "${createdArticle.title}" (${createdArticle.id})`);
  }

  console.log('🎉 [SEED] Database Seeding successfully completed!');
  await client.end();
  process.exit(0);
}

seed().catch(async (err) => {
  console.error('❌ [SEED ERROR]:', err);
  await client.end();
  process.exit(1);
});
