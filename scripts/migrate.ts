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

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL not found in environment');
  process.exit(1);
}

const sql = postgres(connectionString, { max: 1 });

async function runMigration() {
  console.log('🚀 Running database migration on Supabase PostgreSQL...');
  const migrationPath = path.resolve(process.cwd(), 'drizzle/0001_clever_newton_destine.sql');
  const fileContent = fs.readFileSync(migrationPath, 'utf-8');
  const statements = fileContent
    .split('--> statement-breakpoint')
    .map((s) => s.trim())
    .filter(Boolean);

  console.log(`Found ${statements.length} migration statements to apply.`);

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    try {
      await sql.unsafe(stmt);
      console.log(`[${i + 1}/${statements.length}] ✓ Applied`);
    } catch (err: any) {
      if (err.message?.includes('already exists') || err.message?.includes('duplicate key')) {
        console.log(`[${i + 1}/${statements.length}] - Skipped (already exists)`);
      } else {
        console.error(`[${i + 1}/${statements.length}] ⚠️ Warning/Error:`, err.message);
      }
    }
  }

  console.log('🎉 Database migration complete!');
  await sql.end();
  process.exit(0);
}

runMigration().catch(async (err) => {
  console.error('Fatal migration error:', err);
  await sql.end();
  process.exit(1);
});
