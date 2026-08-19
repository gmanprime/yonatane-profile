import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
  displayName: z.string().min(2, 'Display name must be at least 2 characters long').optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;

export const passkeyRegisterOptionsSchema = z.object({
  email: z.string().email().optional(),
});

export const passkeyVerifySchema = z.object({
  credential: z.record(z.string(), z.any()),
});

export type PasskeyVerifyInput = z.infer<typeof passkeyVerifySchema>;
