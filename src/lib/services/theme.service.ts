import { db } from '@/lib/db';
import { themes, type Theme } from '@/lib/db/schema';
import {
  type CreateThemeInput,
  type UpdateThemeInput,
  type ThemeConfig,
} from '@/lib/validators/theme.validator';
import { and, asc, eq } from 'drizzle-orm';

export const SYSTEM_DEFAULT_THEME_CONFIG: ThemeConfig = {
  colors: {
    primary: '#6366f1',
    secondary: '#8b5cf6',
    background: '#090a0f',
    surface: '#12141f',
    text: '#f8fafc',
    accent: '#38bdf8',
    muted: '#94a3b8',
    border: '#1e293b',
  },
  typography: {
    headingFont: 'var(--font-geist-sans), system-ui, sans-serif',
    bodyFont: 'var(--font-geist-sans), system-ui, sans-serif',
    monoFont: 'var(--font-geist-mono), monospace',
    baseFontSize: '16px',
    scaleRatio: 1.25,
  },
  spacing: {
    sectionGap: '3.5rem',
    itemGap: '1.5rem',
    contentMaxWidth: '860px',
  },
  layout: {
    headerAlign: 'center',
    sectionTitleAlign: 'left',
    cardBorderRadius: '12px',
    elevation: 'subtle',
  },
};

export class ThemeService {
  static async getThemes(userId: string): Promise<Theme[]> {
    return db
      .select()
      .from(themes)
      .where(eq(themes.userId, userId))
      .orderBy(asc(themes.createdAt));
  }

  static async getThemeById(id: string, userId?: string): Promise<Theme | null> {
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
  }

  static async getDefaultTheme(userId?: string): Promise<{ id?: string; name: string; isDefault: boolean; config: ThemeConfig }> {
    if (userId) {
      const [userDefault] = await db
        .select()
        .from(themes)
        .where(and(eq(themes.userId, userId), eq(themes.isDefault, true)))
        .limit(1);

      if (userDefault) {
        return userDefault as any;
      }
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
