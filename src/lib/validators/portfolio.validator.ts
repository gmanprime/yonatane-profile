import { z } from 'zod';

export const portfolioLinkSchema = z.object({
  label: z.string().min(1, 'Label is required'),
  url: z.string().url('Invalid URL'),
});

export const createPortfolioItemSchema = z.object({
  title: z.string().min(1, 'Title is required').max(500),
  subtitle: z.string().max(500).optional().nullable(),
  projectItemId: z.string().uuid().optional().nullable(),
  coverImageUrl: z.string().url('Invalid cover image URL').optional().or(z.literal('')).nullable(),
  markdownBody: z.string().optional().default(''),
  tags: z.array(z.string()).optional().default([]),
  links: z.array(portfolioLinkSchema).optional().default([]),
  status: z.enum(['draft', 'published']).optional().default('draft'),
  publishedAt: z.string().datetime().optional().nullable(),
});

export const updatePortfolioItemSchema = createPortfolioItemSchema.partial();

export type PortfolioLink = z.infer<typeof portfolioLinkSchema>;
export type CreatePortfolioItemInput = z.infer<typeof createPortfolioItemSchema>;
export type UpdatePortfolioItemInput = z.infer<typeof updatePortfolioItemSchema>;
