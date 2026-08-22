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

async function migrate() {
  console.log('🚀 [MIGRATION] Creating `app_settings` keystore table...');

  await client`
    CREATE TABLE IF NOT EXISTS app_settings (
      key VARCHAR(100) PRIMARY KEY,
      value TEXT,
      is_secret BOOLEAN NOT NULL DEFAULT false,
      category VARCHAR(50) NOT NULL DEFAULT 'general',
      description TEXT,
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );
  `;

  console.log('✅ [MIGRATION] `app_settings` table is ready.');

  // Auto-migrate any environment keys present in .env
  const keysToMigrate = [
    { key: 'RXRESUME_API_KEY', isSecret: true, category: 'integrations', desc: 'RxResume API Key for REST & PDF exports' },
    { key: 'RXRESUME_BASE_URL', isSecret: false, category: 'integrations', desc: 'RxResume Host Base URL (default: https://rxresu.me)' },
    { key: 'RXRESUME_DEFAULT_RESUME_ID', isSecret: false, category: 'integrations', desc: 'Default RxResume ID for PDF downloads' },
    { key: 'NEXT_PUBLIC_SITE_URL', isSecret: false, category: 'general', desc: 'Canonical public domain URL' },
    { key: 'SITE_URL', isSecret: false, category: 'general', desc: 'Canonical site URL' },
  ];

  for (const item of keysToMigrate) {
    const envVal = process.env[item.key];
    if (envVal && envVal.trim()) {
      const existing = await client`SELECT key FROM app_settings WHERE key = ${item.key} LIMIT 1`;
      if (existing.length === 0) {
        await client`
          INSERT INTO app_settings (key, value, is_secret, category, description, updated_at)
          VALUES (${item.key}, ${envVal.trim()}, ${item.isSecret}, ${item.category}, ${item.desc}, NOW())
          ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
        `;
        console.log(`  ↳ Migrated setting: ${item.key} (secret: ${item.isSecret})`);
      } else {
        console.log(`  ↳ Setting already exists in DB: ${item.key}`);
      }
    }
  }

  console.log('🎉 [MIGRATION] Keystore migration completed successfully.');
  await client.end();
  process.exit(0);
}

migrate().catch(async (err) => {
  console.error('❌ [MIGRATION ERROR]:', err);
  await client.end();
  process.exit(1);
});
