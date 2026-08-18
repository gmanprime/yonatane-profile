import { z } from 'zod';

// ============================================================
// RxResume Schema Types & Validators
// ============================================================

export const rxResumePictureSchema = z.object({
  hidden: z.boolean().optional().default(false),
  url: z.string().optional().default(''),
  size: z.number().optional().default(64),
  rotation: z.number().optional().default(0),
  aspectRatio: z.number().optional().default(1),
  borderRadius: z.number().optional().default(0),
  borderColor: z.string().optional().default(''),
  borderWidth: z.number().optional().default(0),
  shadowColor: z.string().optional().default(''),
  shadowWidth: z.number().optional().default(0),
}).passthrough();

export const rxResumeCustomFieldSchema = z.object({
  id: z.string().optional(),
  icon: z.string().optional().default(''),
  text: z.string().optional().default(''),
  link: z.string().optional().default(''),
}).passthrough();

export const rxResumeBasicsSchema = z.object({
  name: z.string().optional().default(''),
  headline: z.string().optional().default(''),
  email: z.string().optional().default(''),
  phone: z.string().optional().default(''),
  location: z.string().optional().default(''),
  website: z.union([
    z.string(),
    z.object({
      url: z.string().optional().default(''),
      label: z.string().optional().default(''),
    }).passthrough(),
  ]).optional(),
  customFields: z.array(rxResumeCustomFieldSchema).optional().default([]),
}).passthrough();

export const rxResumeSummarySchema = z.object({
  title: z.string().optional().default('Summary'),
  icon: z.string().optional().default(''),
  columns: z.number().optional().default(1),
  hidden: z.boolean().optional().default(false),
  content: z.string().optional().default(''),
}).passthrough();

export const rxResumeSectionItemSchema = z.object({
  id: z.string().optional(),
  hidden: z.boolean().optional().default(false),
}).passthrough();

export const rxResumeSectionSchema = z.object({
  title: z.string().optional().default(''),
  icon: z.string().optional().default(''),
  columns: z.number().optional().default(1),
  hidden: z.boolean().optional().default(false),
  items: z.array(rxResumeSectionItemSchema).optional().default([]),
}).passthrough();

export const rxResumeSchema = z.object({
  picture: rxResumePictureSchema.optional(),
  basics: rxResumeBasicsSchema.optional(),
  summary: rxResumeSummarySchema.optional(),
  sections: z.record(z.string(), rxResumeSectionSchema).optional().default({}),
  metadata: z.record(z.string(), z.any()).optional(),
}).passthrough();

export type RxResumeData = z.infer<typeof rxResumeSchema>;

// ============================================================
// JSON Resume Standard Validator
// ============================================================

export const jsonResumeSchema = z.object({
  basics: z.object({
    name: z.string().optional(),
    label: z.string().optional(),
    image: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    url: z.string().optional(),
    summary: z.string().optional(),
    location: z.any().optional(),
    profiles: z.array(z.any()).optional(),
  }).passthrough().optional(),
  work: z.array(z.any()).optional(),
  volunteer: z.array(z.any()).optional(),
  education: z.array(z.any()).optional(),
  awards: z.array(z.any()).optional(),
  certificates: z.array(z.any()).optional(),
  publications: z.array(z.any()).optional(),
  skills: z.array(z.any()).optional(),
  languages: z.array(z.any()).optional(),
  interests: z.array(z.any()).optional(),
  references: z.array(z.any()).optional(),
  projects: z.array(z.any()).optional(),
}).passthrough();

export type JsonResumeData = z.infer<typeof jsonResumeSchema>;

// Import payload schema
export const importPayloadSchema = z.object({
  name: z.string().min(1, 'Dataset name is required').max(255),
  type: z.enum(['rxresume', 'jsonresume', 'auto']).default('auto'),
  data: z.union([rxResumeSchema, jsonResumeSchema, z.record(z.string(), z.any())]),
});

export type ImportPayloadInput = z.infer<typeof importPayloadSchema>;
