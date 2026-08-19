import { db } from '@/lib/db';
import { themes, type Theme } from '@/lib/db/schema';
import {
  type CreateThemeInput,
  type UpdateThemeInput,
  type ThemeConfig,
  SYSTEM_DEFAULT_THEME_CONFIG,
} from '@/lib/validators/theme.validator';

export { SYSTEM_DEFAULT_THEME_CONFIG };
import { and, asc, eq } from 'drizzle-orm';


export class ThemeService {
  static async getThemes(userId: string): Promise<Theme[]> {
    return db
      .select()
      .from(themes)
      .where(eq(themes.userId, userId))
      .orderBy(asc(themes.createdAt));
  }

  static async getThemeById(id: string, userId?: string): Promise<Theme | null> {
    try {
      const conditions = [eq(themes.id, id)];
      if (userId) {
        conditions.push(eq(themes.userId, userId));
      }

      const [theme] = await db
        .select()
        .from(themes)
        .where(and(...conditions))
        .limit(1);

      return theme || null;
    } catch (error) {
      console.warn('Database offline or unreachable while fetching theme by id:', error);
      return null;
    }
  }

  static async getDefaultTheme(userId?: string): Promise<{ id?: string; name: string; isDefault: boolean; config: ThemeConfig }> {
    try {
      if (userId) {
        const [userDefault] = await db
          .select()
          .from(themes)
          .where(and(eq(themes.userId, userId), eq(themes.isDefault, true)))
          .limit(1);

        if (userDefault) {
          return {
            id: userDefault.id,
            name: userDefault.name,
            isDefault: userDefault.isDefault,
            config: userDefault.config as ThemeConfig,
          };
        }
      }
    } catch (error) {
      console.warn('Database offline or unreachable while fetching default theme:', error);
    }

    // Return system default theme
    return {
      name: 'Obsidian Minimalist',
      isDefault: true,
      config: SYSTEM_DEFAULT_THEME_CONFIG,
    };
  }

  static async createTheme(userId: string, input: CreateThemeInput): Promise<Theme> {
    return await db.transaction(async (tx) => {
      if (input.isDefault) {
        await tx
          .update(themes)
          .set({ isDefault: false })
          .where(eq(themes.userId, userId));
      }

      const [newTheme] = await tx
        .insert(themes)
        .values({
          userId,
          name: input.name,
          isDefault: input.isDefault ?? false,
          config: input.config,
        })
        .returning();

      return newTheme;
    });
  }

  static async updateTheme(id: string, userId: string, input: UpdateThemeInput): Promise<Theme | null> {
    return await db.transaction(async (tx) => {
      if (input.isDefault) {
        await tx
          .update(themes)
          .set({ isDefault: false })
          .where(eq(themes.userId, userId));
      }

      const [updated] = await tx
        .update(themes)
        .set({
          ...input,
          updatedAt: new Date(),
        })
        .where(and(eq(themes.id, id), eq(themes.userId, userId)))
        .returning();

      return updated || null;
    });
  }

  static async deleteTheme(id: string, userId: string): Promise<boolean> {
    const [deleted] = await db
      .delete(themes)
      .where(and(eq(themes.id, id), eq(themes.userId, userId)))
      .returning({ id: themes.id });

    return !!deleted;
  }
}
