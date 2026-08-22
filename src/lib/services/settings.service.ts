import { db } from '@/lib/db';
import { appSettings, type AppSetting } from '@/lib/db/schema';
import { eq, inArray } from 'drizzle-orm';

export interface SetSettingOptions {
  isSecret?: boolean;
  category?: string;
  description?: string;
}

export class SettingsService {
  /**
   * Retrieves a setting value by key from the database.
   * If the key is not in the DB, it checks process.env as a one-time migration fallback
   * and automatically saves it to the database.
   */
  static async get(key: string, defaultValue: string | null = null): Promise<string | null> {
    try {
      const [setting] = await db
        .select()
        .from(appSettings)
        .where(eq(appSettings.key, key))
        .limit(1);

      if (setting && setting.value !== null && setting.value !== undefined) {
        return setting.value;
      }

      // Auto-migrate from process.env if present
      const envVal = process.env[key];
      if (envVal && envVal.trim()) {
        const isSecret = key.toLowerCase().includes('key') || key.toLowerCase().includes('secret') || key.toLowerCase().includes('token');
        await this.set(key, envVal.trim(), {
          isSecret,
          category: key.toLowerCase().startsWith('rxresume') ? 'integrations' : 'general',
          description: `Migrated from environment variable (${key})`,
        });
        return envVal.trim();
      }

      return defaultValue;
    } catch (error) {
      console.warn(`[SettingsService] Database query failed for key "${key}":`, error);
      return process.env[key] || defaultValue;
    }
  }

  /**
   * Upserts a setting into the database keystore.
   */
  static async set(
    key: string,
    value: string,
    options: SetSettingOptions = {}
  ): Promise<AppSetting> {
    const isSecret = options.isSecret ?? (key.toLowerCase().includes('key') || key.toLowerCase().includes('secret') || key.toLowerCase().includes('token'));
    const category = options.category || (key.toLowerCase().startsWith('rxresume') ? 'integrations' : 'general');
    const description = options.description || null;

    const [saved] = await db
      .insert(appSettings)
      .values({
        key,
        value,
        isSecret,
        category,
        description,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: appSettings.key,
        set: {
          value,
          isSecret,
          category,
          description: description || undefined,
          updatedAt: new Date(),
        },
      })
      .returning();

    return saved;
  }

  /**
   * Retrieves multiple settings in a single batch query.
   */
  static async getMany(keys: string[]): Promise<Record<string, string | null>> {
    const result: Record<string, string | null> = {};
    if (keys.length === 0) return result;

    try {
      const records = await db
        .select()
        .from(appSettings)
        .where(inArray(appSettings.key, keys));

      const map = new Map<string, string | null>();
      records.forEach((r) => map.set(r.key, r.value));

      for (const k of keys) {
        if (map.has(k)) {
          result[k] = map.get(k)!;
        } else {
          // Check process.env fallback
          result[k] = process.env[k] || null;
        }
      }
    } catch {
      for (const k of keys) {
        result[k] = process.env[k] || null;
      }
    }

    return result;
  }

  /**
   * Returns all settings stored in the database.
   * If maskSecrets is true, masks sensitive keys (e.g. "••••••••xxxx").
   */
  static async getAll(maskSecrets = true): Promise<AppSetting[]> {
    try {
      const records = await db.select().from(appSettings);

      if (!maskSecrets) return records;

      return records.map((r) => {
        if (r.isSecret && r.value) {
          const val = r.value;
          const masked = val.length > 8
            ? `••••••••${val.slice(-4)}`
            : '••••••••';
          return {
            ...r,
            value: masked,
          };
        }
        return r;
      });
    } catch {
      return [];
    }
  }

  /**
   * Deletes a setting by key.
   */
  static async delete(key: string): Promise<boolean> {
    const [deleted] = await db
      .delete(appSettings)
      .where(eq(appSettings.key, key))
      .returning();

    return !!deleted;
  }

  /**
   * One-time migration routine to migrate non-essential environment variables
   * into the PostgreSQL keystore table.
   */
  static async bootstrapFromEnv(): Promise<{ migrated: string[] }> {
    const migrated: string[] = [];

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
        const [existing] = await db
          .select({ key: appSettings.key })
          .from(appSettings)
          .where(eq(appSettings.key, item.key))
          .limit(1);

        if (!existing) {
          await this.set(item.key, envVal.trim(), {
            isSecret: item.isSecret,
            category: item.category,
            description: item.desc,
          });
          migrated.push(item.key);
        }
      }
    }

    return { migrated };
  }
}
