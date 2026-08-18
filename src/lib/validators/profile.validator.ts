import { z } from 'zod';

export const createProfileSchema = z.object({
  name: z.string().min(1, 'Profile name is required').max(255),
  description: z.string().optional().nullable(),
  hash: z.string().min(1).max(16).optional(),
  isDefault: z.boolean().optional().default(false),
  contentDatasetId: z.string().uuid().optional().nullable(),
  themeId: z.string().uuid().optional().nullable(),
});

export const updateProfileSchema = createProfileSchema.partial();

export type CreateProfileInput = z.infer<typeof createProfileSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const profileSectionItemConfigSchema = z.object({
  sectionId: z.string().uuid('Invalid section ID'),
  visible: z.boolean().default(true),
  selectedItemIds: z.array(z.string()).optional().default([]),
  displayOrder: z.number().int().default(0),
});

export const updateProfileSectionsSchema = z.object({
  sections: z.array(profileSectionItemConfigSchema),
});

export type ProfileSectionItemConfig = z.infer<typeof profileSectionItemConfigSchema>;
export type UpdateProfileSectionsInput = z.infer<typeof updateProfileSectionsSchema>;
