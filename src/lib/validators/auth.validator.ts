import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
});

export type LoginInput = z.infer<typeof loginSchema>;

// TOTP master key can be used in place of password
export const loginWithTotpSchema = z.object({
  email: z.string().email('Invalid email address'),
  totpCode: z.string().length(6, 'TOTP code must be exactly 6 digits').regex(/^\d{6}$/, 'TOTP code must be numeric'),
});

export type LoginWithTotpInput = z.infer<typeof loginWithTotpSchema>;

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
  displayName: z.string().min(2, 'Display name must be at least 2 characters long').optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;

// Invite-gated registration: token required
export const inviteRegisterSchema = z.object({
  token: z.string().min(1, 'Invite token is required'),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  displayName: z.string().min(2, 'Display name must be at least 2 characters long').optional(),
});

export type InviteRegisterInput = z.infer<typeof inviteRegisterSchema>;

// Admin: create invite
export const createInviteSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['admin', 'editor']).default('admin'),
  expiresInHours: z.number().min(1).max(168).default(24), // 1 hour to 7 days
});

export type CreateInviteInput = z.infer<typeof createInviteSchema>;

// Password change (self-service or TOTP master recovery)
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().optional(),
    totpRecoveryCode: z.string().length(6, 'TOTP code must be exactly 6 digits').regex(/^\d{6}$/, 'TOTP code must be numeric').optional(),
    newPassword: z.string().min(8, 'New password must be at least 8 characters long'),
    confirmPassword: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })
  .refine((data) => Boolean(data.currentPassword) || Boolean(data.totpRecoveryCode), {
    message: 'Either current password or 6-digit TOTP emergency recovery code is required',
    path: ['currentPassword'],
  });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

// Admin: force password reset
export const adminResetPasswordSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  temporaryPassword: z.string().min(8, 'Temporary password must be at least 8 characters long').optional(),
});

export type AdminResetPasswordInput = z.infer<typeof adminResetPasswordSchema>;

// TOTP enrollment
export const totpSetupSchema = z.object({
  totpCode: z.string().length(6, 'TOTP code must be exactly 6 digits').regex(/^\d{6}$/, 'TOTP code must be numeric'),
});

export type TotpSetupInput = z.infer<typeof totpSetupSchema>;

// Passkey registration options (authenticated only)
export const passkeyRegisterOptionsSchema = z.object({
  deviceName: z.string().max(255).optional(),
});

// Passkey assertion (for login — unauthenticated)
export const passkeyAssertionSchema = z.object({
  credential: z.object({
    id: z.string(),
    rawId: z.string(),
    type: z.string(),
    response: z.object({
      authenticatorData: z.string(),
      clientDataJSON: z.string(),
      signature: z.string(),
      userHandle: z.string().optional(),
    }),
  }),
});

export type PasskeyAssertionInput = z.infer<typeof passkeyAssertionSchema>;

// Passkey verification (for registration — authenticated)
export const passkeyVerifySchema = z.object({
  credential: z.record(z.string(), z.any()),
  deviceName: z.string().max(255).optional(),
});

export type PasskeyVerifyInput = z.infer<typeof passkeyVerifySchema>;
