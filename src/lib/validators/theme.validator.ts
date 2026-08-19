import { z } from 'zod';

export const themeColorsSchema = z.object({
  primary: z.string().optional(),
  secondary: z.string().optional(),
  background: z.string().optional(),
  surface: z.string().optional(),
  text: z.string().optional(),
  accent: z.string().optional(),
  muted: z.string().optional(),
  border: z.string().optional(),
}).passthrough();

export const themeTypographySchema = z.object({
  headingFont: z.string().optional(),
  bodyFont: z.string().optional(),
  monoFont: z.string().optional(),
  baseFontSize: z.string().optional(),
  scaleRatio: z.number().optional(),
}).passthrough();

export const themeSpacingSchema = z.object({
  sectionGap: z.string().optional(),
  itemGap: z.string().optional(),
  contentMaxWidth: z.string().optional(),
}).passthrough();

export const themeConfigSchema = z.object({
  colors: themeColorsSchema.optional(),
  typography: themeTypographySchema.optional(),
  layout: z.record(z.string(), z.any()).optional(),
  spacing: themeSpacingSchema.optional(),
}).passthrough();

export const createThemeSchema = z.object({
  name: z.string().min(1, 'Theme name is required').max(255),
  isDefault: z.boolean().optional().default(false),
  config: themeConfigSchema,
});

export const updateThemeSchema = createThemeSchema.partial();

export type ThemeConfig = z.infer<typeof themeConfigSchema>;
export type CreateThemeInput = z.infer<typeof createThemeSchema>;
export type UpdateThemeInput = z.infer<typeof updateThemeSchema>;

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
