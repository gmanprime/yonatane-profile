import * as fs from 'fs';
import * as path from 'path';
import postgres from 'postgres';

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

async function linkPortfolioProjects() {
  console.log('🔗 [PORTFOLIO-PROJECT-LINKER] Verifying and linking articles to project items...');

  // 1. Get all published portfolio articles
  const articles = await client`
    SELECT id, title, subtitle, project_item_id, cover_image_url
    FROM portfolio_items
  `;

  // 2. Get all project section items
  const projectItems = await client`
    SELECT si.id, si.section_id, si.data
    FROM section_items si
    JOIN sections s ON si.section_id = s.id
    WHERE s.type = 'projects'
  `;

  console.log(`Found ${articles.length} article(s) and ${projectItems.length} project item(s).`);

  let linkedCount = 0;

  for (const art of articles) {
    const artTitle = (art.title as string).toLowerCase();

    // Match project item by keywords in title/name
    const match = projectItems.find((p) => {
      const data = (p.data || {}) as Record<string, unknown>;
      const pName = ((data.name || data.title || '') as string).toLowerCase();
      const pDesc = ((data.description || data.summary || '') as string).toLowerCase();

      if (artTitle.includes('u-net') || artTitle.includes('super-resolution') || artTitle.includes('thesis')) {
        return pName.includes('u-net') || pName.includes('super-resolution') || pDesc.includes('super-resolution');
      }
      if (artTitle.includes('mesh') || artTitle.includes('sync')) {
        return pName.includes('mesh') || pName.includes('sync') || pName.includes('obsidian');
      }
      if (artTitle.includes('homelab') || artTitle.includes('server') || artTitle.includes('ingress')) {
        return pName.includes('server') || pName.includes('homelab') || pName.includes('infrastructure');
      }
      if (artTitle.includes('induction') || artTitle.includes('microcontroller') || artTitle.includes('hardware')) {
        return pName.includes('induction') || pName.includes('microcontroller') || pName.includes('embedded');
      }
      return pName && artTitle.includes(pName);
    });

    if (match) {
      await client`
        UPDATE portfolio_items
        SET project_item_id = ${match.id}
        WHERE id = ${art.id}
      `;
      console.log(`Linked article "${art.title}" -> Project Item ID: ${match.id}`);
      linkedCount++;
    } else {
      console.log(`Article "${art.title}" has no direct matching project item.`);
    }
  }

  console.log(`✅ [SUCCESS] Linked ${linkedCount} article(s) directly to project section items!`);
  await client.end();
  process.exit(0);
}

linkPortfolioProjects().catch(async (err) => {
  console.error('❌ [LINKER ERROR]:', err);
  await client.end();
  process.exit(1);
});
