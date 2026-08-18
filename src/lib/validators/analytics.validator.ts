import { z } from 'zod';

export const analyticsQuerySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  limit: z.coerce.number().int().positive().max(1000).optional().default(100),
  offset: z.coerce.number().int().nonnegative().optional().default(0),
});

export const telemetryRecordSchema = z.object({
  ipAddress: z.string().max(45).optional().nullable(),
  country: z.string().max(100).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  region: z.string().max(100).optional().nullable(),
  userAgent: z.string().optional().nullable(),
  deviceType: z.string().max(20).optional().nullable(), // mobile | desktop | tablet
  browser: z.string().max(100).optional().nullable(),
  os: z.string().max(100).optional().nullable(),
  referrer: z.string().optional().nullable(),
  screenWidth: z.number().int().optional().nullable(),
  screenHeight: z.number().int().optional().nullable(),
});

export type AnalyticsQueryInput = z.input<typeof analyticsQuerySchema>;
export type AnalyticsQueryOutput = z.infer<typeof analyticsQuerySchema>;
export type TelemetryRecordInput = z.infer<typeof telemetryRecordSchema>;
