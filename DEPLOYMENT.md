# Production Deployment & Operations Guide

**Project:** Yonatan Elias — Personal Profile & Stealth Portfolio Platform  
**Target Domain:** `yonatanelias.dpdns.org`  
**Stack:** Next.js 15 (App Router) + Supabase (PostgreSQL) + Drizzle ORM + TypeScript + Vercel  

---

## Table of Contents

1. [Architecture & Infrastructure Overview](#1-architecture--infrastructure-overview)
2. [Supabase Backend Configuration](#2-supabase-backend-configuration)
3. [Database Migrations & Seeding](#3-database-migrations--seeding)
4. [Vercel Deployment Guide](#4-vercel-deployment-guide)
5. [Custom Domain & DNS Setup](#5-custom-domain--dns-setup)
6. [Stealth Routing & Cookie Harness](#6-stealth-routing--cookie-harness)
7. [Environment Variable Reference](#7-environment-variable-reference)
8. [Maintenance & Backup Procedures](#8-maintenance--backup-procedures)

---

## 1. Architecture & Infrastructure Overview

```
+-----------------------------------------------------------------------------------+
|                                 CLIENT BROWSERS                                   |
|   - Mobile (iOS/Android) | Desktop | Tablets | Automated Crawlers (Google/Bing)   |
+-----------------------------------------------------------------------------------+
                                         |
                                         v  HTTPS (TLS 1.3)
+-----------------------------------------------------------------------------------+
|                        EDGE NETWORK & DNS (Cloudflare / Dynamic DNS)              |
|   Domain: yonatanelias.dpdns.org                                                  |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
|                        VERCEL SERVERLESS HOSTING (Next.js 15)                     |
|                                                                                   |
|   +--------------------------+  +------------------------+  +------------------+  |
|   | Public Profile Renderer  |  | Portfolio Blog Reader  |  | Admin Studio CMS |  |
|   | (/p/[hash], /)           |  | (/portfolio, /blog)    |  | (/admin/*)       |  |
|   +--------------------------+  +------------------------+  +------------------+  |
|   | Stealth Middleware (Cookie inspection & rewrite)                            |  |
|   | Dynamic SEO / Sitemap / Robots / OpenGraph Generator                          |  |
+-----------------------------------------------------------------------------------+
                       |                                       |
                       v Pooler (port 6543 / 5432)             v HTTPS REST / Auth
+-----------------------------------------------------------------------------------+
|                        SUPABASE CLOUD INFRASTRUCTURE                              |
|                                                                                   |
|   +---------------------------------------+  +--------------------------------+   |
|   | PostgreSQL Database (Drizzle ORM)     |  | Supabase Auth                  |   |
|   | - users, content_datasets, sections   |  | - Email/Password, OAuth        |   |
|   | - section_items, themes, profiles     |  | - Passkeys / WebAuthn          |   |
|   | - profile_sections, portfolio_items   |  | - Session JWT verification     |   |
|   | - profile_analytics telemetry         |  |                                |   |
|   +---------------------------------------+  +--------------------------------+   |
+-----------------------------------------------------------------------------------+
```

---

## 2. Supabase Backend Configuration

### Step 1: Create Supabase Project
1. Log into [Supabase Dashboard](https://supabase.com/dashboard).
2. Create a new project named `yonatane-profile`.
3. Choose your closest geographical region.
4. Record your database password and project reference URL.

### Step 2: Retrieve Connection Strings & API Keys
Under **Project Settings > Database**:
* **Direct Connection String:** `postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres`
* **Connection Pooler (Transaction / Session mode):** `postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres`

Under **Project Settings > API**:
* `Project URL`: `https://[PROJECT-REF].supabase.co`
* `anon (public)` key: `eyJh...`
* `service_role (secret)` key: `eyJh...`

### Step 3: Configure Supabase Auth
Under **Authentication > URL Configuration**:
* **Site URL:** `https://yonatanelias.dpdns.org`
* **Redirect URLs:**
  * `https://yonatanelias.dpdns.org/api/v1/auth/callback`
  * `http://localhost:3000/api/v1/auth/callback` (for local dev)

---

## 3. Database Migrations & Seeding

### Step 1: Apply Drizzle Database Schema
Push the schema directly to your production Supabase database:

```bash
# Set DATABASE_URL in your environment or .env.local
export DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"

# Push schema directly
npx drizzle-kit push
```

### Step 2: Run Production Data Seeding
Import the master CV data (`yonatan-elias-cv-16-08-2026.json`), theme palettes, stealth profiles, and starter portfolio articles:

```bash
npm run seed
```

Output:
```
🌱 [SEED] Starting Database Seeding & Production Data Integration...
📖 [SEED] Reading CV data from yonatan-elias-cv-16-08-2026.json...
👤 [SEED] Syncing user yonatane504@gmail.com...
✅ [SEED] Created content dataset: Yonatan Elias — Master CV (Aug 2026)
  ↳ Inserted section: Profiles (2 items)
  ↳ Inserted section: Experience (3 items)
  ↳ Inserted section: Education (3 items)
  ↳ Inserted section: Projects (4 items)
  ↳ Inserted section: Skills (6 items)
  ↳ Inserted section: Languages (3 items)
  ↳ Inserted section: Honours & Awards (1 items)
  ↳ Inserted section: Certifications & Training (3 items)
  ↳ Inserted section: Management & Leadership (2 items)
🎨 [SEED] Seeding theme configurations...
  ↳ Created theme: Obsidian Minimalist (Default)
  ↳ Created theme: Cyber Indigo
  ↳ Created theme: Solaris Minimal Light
🚀 [SEED] Seeding stealth profiles...
  ↳ Created profile: Master Profile (Default) (/p/default)
  ↳ Created profile: Deep Learning & AI Research (/p/ai-deep)
  ↳ Created profile: Systems & GIS Engineering Focus (/p/gis-sys)
📝 [SEED] Seeding starter portfolio blog articles...
  ↳ Created portfolio article: "Deep Learning Temperature Super-Resolution: U-Net GAN Architecture"
  ↳ Created portfolio article: "Designing a Peer-to-Peer Mesh Sync Engine for Obsidian Vaults"
  ↳ Created portfolio article: "Automating Enterprise GIS Pipelines: From Ingress to Spatial Analytics"
  ↳ Created portfolio article: "Microcontroller-Based Induction Heating & Power Electronics Control"
🎉 [SEED] Database Seeding successfully completed!
```

---

## 4. Vercel Deployment Guide

### Step 1: Import Project to Vercel
1. Connect your GitHub repository to [Vercel](https://vercel.com).
2. Framework Preset: **Next.js**.
3. Root Directory: `./` (or repository root).
4. Build Command: `npm run build` (or default).
5. Output Directory: `.next`.

### Step 2: Configure Environment Variables in Vercel
Add the following keys in Vercel **Project Settings > Environment Variables**:

| Variable Name | Description | Environment |
| :--- | :--- | :--- |
| `DATABASE_URL` | Supabase Postgres connection string (use pooler port 6543) | Production, Preview |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (`https://[PROJECT-REF].supabase.co`) | Production, Preview, Dev |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`| Supabase public anon key | Production, Preview, Dev |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase secret service role key (for admin sync) | Production, Preview |
| `NEXT_PUBLIC_SITE_URL` | Canonical site domain (`https://yonatanelias.dpdns.org`) | Production |

### Step 3: Trigger Production Deployment
Click **Deploy**. Vercel will execute `npm run build`, bundle the Next.js serverless functions, and deploy the application globally across edge regions.

---

## 5. Custom Domain & DNS Setup

To link your dynamic DNS domain (`yonatanelias.dpdns.org`) or a custom root domain:

### Vercel Domain Configuration:
1. In Vercel, navigate to **Settings > Domains**.
2. Enter `yonatanelias.dpdns.org` and click **Add**.

### DNS Provider Configuration:
Configure the DNS records at your DNS host:

* **CNAME Record (Subdomain):**
  * Type: `CNAME`
  * Name / Host: `yonatanelias` (or `@` if supported)
  * Target / Value: `cname.vercel-dns.com`
  * TTL: `Automatic` or `300`

* **A Record (Root Fallback):**
  * Type: `A`
  * Value: `76.76.21.21`

Vercel automatically provisions and renews SSL/TLS certificates through Let's Encrypt.

---

## 6. Stealth Routing & Cookie Harness

The platform uses a stealth routing mechanism designed for sharing targeted profile views with recruiters and partners:

1. **Shareable Stealth Link:** `https://yonatanelias.dpdns.org/p/[hash]` (e.g., `/p/ai-deep` or `/p/gis-sys`).
2. **Cookie Persistence:** When a visitor clicks a stealth link, Next.js middleware sets a 30-day secure cookie `__profile=[hash]`.
3. **Subsequent Root Visits:** When that visitor navigates to `https://yonatanelias.dpdns.org/`, the server reads `__profile` and renders their personalized view.
4. **Telemetry Ingress:** Visits log anonymized telemetry (Device, OS, Browser, Geolocation, Referrer) into `profile_analytics` table, accessible in the Admin Analytics Dashboard.

---

## 7. Environment Variable Reference

```env
# ============================================================
# SUPABASE / POSTGRESQL DATABASE
# ============================================================
DATABASE_URL="postgresql://postgres:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true"

# ============================================================
# SUPABASE AUTH & STORAGE
# ============================================================
NEXT_PUBLIC_SUPABASE_URL="https://[PROJECT-REF].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsIn..."
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsIn..."

# ============================================================
# PUBLIC CANONICAL URL
# ============================================================
NEXT_PUBLIC_SITE_URL="https://yonatanelias.dpdns.org"
```

---

## 8. Maintenance & Backup Procedures

### Database Backups:
- Supabase automatically performs daily physical backups.
- For manual SQL dumps:
  ```bash
  pg_dump -h db.[PROJECT-REF].supabase.co -U postgres -d postgres > backup-$(date +%Y%m%d).sql
  ```

### Content Re-Import & Updates:
- Use the **Admin Content Portal** (`/admin/content`) to drag-and-drop new RxResume JSON exports.
- Or update `yonatan-elias-cv-16-08-2026.json` and re-run `npm run seed`.
