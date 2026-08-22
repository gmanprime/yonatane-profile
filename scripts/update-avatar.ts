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

async function updateAvatar() {
  console.log('🖼️ [AVATAR] Updating content datasets to use /avatar.jpg...');

  const picturePayload = {
    url: '/avatar.jpg',
    hidden: false,
    aspectRatio: 1,
    borderRadius: 50,
  };

  const updated = await client`
    UPDATE content_datasets
    SET picture = ${JSON.stringify(picturePayload)}::jsonb, updated_at = NOW()
    RETURNING id, name, picture
  `;

  console.log(`✅ [AVATAR] Updated ${updated.length} dataset(s) with new profile image!`);
  await client.end();
  process.exit(0);
}

updateAvatar().catch(async (err) => {
  console.error('❌ [AVATAR ERROR]:', err);
  await client.end();
  process.exit(1);
});
