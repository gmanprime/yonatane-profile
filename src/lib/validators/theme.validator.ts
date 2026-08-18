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
