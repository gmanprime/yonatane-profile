import { z } from 'zod';

export const createContentDatasetSchema = z.object({
  name: z.string().min(1, 'Dataset name is required').max(255),
  rawJson: z.any().optional().nullable(),
  basics: z.record(z.string(), z.any()).optional().nullable(),
  summary: z.string().optional().nullable(),
  picture: z.record(z.string(), z.any()).optional().nullable(),
});

export const updateContentDatasetSchema = createContentDatasetSchema.partial();

export type CreateContentDatasetInput = z.infer<typeof createContentDatasetSchema>;
export type UpdateContentDatasetInput = z.infer<typeof updateContentDatasetSchema>;

export const createSectionSchema = z.object({
  type: z.string().min(1, 'Section type is required').max(50),
  title: z.string().min(1, 'Section title is required').max(255),
  icon: z.string().max(100).optional().default(''),
  columns: z.number().int().min(1).max(4).optional().default(1),
  hidden: z.boolean().optional().default(false),
  displayOrder: z.number().int().optional().default(0),
});

export const updateSectionSchema = createSectionSchema.partial();

export type CreateSectionInput = z.infer<typeof createSectionSchema>;
export type UpdateSectionInput = z.infer<typeof updateSectionSchema>;

export const createSectionItemSchema = z.object({
  data: z.record(z.string(), z.any()),
  hidden: z.boolean().optional().default(false),
  displayOrder: z.number().int().optional().default(0),
});

export const updateSectionItemSchema = createSectionItemSchema.partial();

export type CreateSectionItemInput = z.infer<typeof createSectionItemSchema>;
export type UpdateSectionItemInput = z.infer<typeof updateSectionItemSchema>;

export const reorderSectionsSchema = z.object({
  sectionIds: z.array(z.string().uuid()),
});

export const reorderSectionItemsSchema = z.object({
  itemIds: z.array(z.string().uuid()),
});

export type ReorderSectionsInput = z.infer<typeof reorderSectionsSchema>;
export type ReorderSectionItemsInput = z.infer<typeof reorderSectionItemsSchema>;
