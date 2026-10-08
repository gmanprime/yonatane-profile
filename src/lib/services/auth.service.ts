import crypto from 'node:crypto';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { db } from '@/lib/db';
import {
  users,
  userInvites,
  securityEvents,
  appSettings,
  type User,
  type UserInvite,
  type SecurityEvent,
} from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { createServerClient } from '@supabase/ssr';
import type { User as SupabaseUser, Session as SupabaseSession } from '@supabase/supabase-js';

// ============================================================
// BASE32 & RFC 6238 TOTP HELPERS (No external TOTP dependencies)
// ============================================================

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = '';

  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;

    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
}

function base32Decode(encoded: string): Buffer {
  const clean = encoded.toUpperCase().replace(/[\s=-]/g, '');
  const bytes: number[] = [];
  let bits = 0;
  let value = 0;

  for (let i = 0; i < clean.length; i++) {
    const idx = BASE32_ALPHABET.indexOf(clean[i]);
    if (idx === -1) {
      throw new Error(`Invalid Base32 character: ${clean[i]}`);
    }
    value = (value << 5) | idx;
    bits += 5;

    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}

function generateTotpForCounter(secretBuffer: Buffer, counter: number): string {
  const timeBuffer = Buffer.alloc(8);
  timeBuffer.writeBigInt64BE(BigInt(counter));

  const hmac = crypto.createHmac('sha1', secretBuffer);
  hmac.update(timeBuffer);
  const hash = hmac.digest();

  const offset = hash[hash.length - 1] & 0x0f;
  const binary =
    ((hash[offset] & 0x7f) << 24) |
    ((hash[offset + 1] & 0xff) << 16) |
    ((hash[offset + 2] & 0xff) << 8) |
    (hash[offset + 3] & 0xff);

  const otp = binary % 1000000;
  return otp.toString().padStart(6, '0');
}

function getEncryptionKey(): Buffer {
  const seed =
    process.env.TOTP_ENCRYPTION_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    'fallback-totp-master-secret-key-32b';
  return crypto.createHash('sha256').update(seed).digest();
}

function encryptSecret(plainText: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

function decryptSecret(encryptedPayload: string): string {
  const parts = encryptedPayload.split(':');
  if (parts.length !== 3) {
    return encryptedPayload;
  }
  const [ivHex, tagHex, dataHex] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  const encrypted = Buffer.from(dataHex, 'hex');

  // Try candidate encryption keys to guarantee decryption across environments
  const candidateSeeds = [
    process.env.TOTP_ENCRYPTION_KEY,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    'fallback-totp-master-secret-key-32b',
  ].filter(Boolean) as string[];

  for (const seed of candidateSeeds) {
    try {
      const key = crypto.createHash('sha256').update(seed).digest();
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(tag);
      const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
      return decrypted.toString('utf8');
    } catch {
      // Continue to next candidate
    }
  }

  throw new Error('Unable to decrypt stored secret with configured encryption keys');
}

// ============================================================
// AUTH SERVICE CLASS
// ============================================================

export class AuthService {
  /**
   * Checks if an email is authorized to create an account.
   * Allows platform owner and any email pre-authorized in the database `users` table.
   */
  static async isAuthorizedEmail(email: string): Promise<boolean> {
    const normalizedEmail = email.toLowerCase().trim();

    // System owners always authorized
    if (
      normalizedEmail === 'yonatane504@gmail.com' ||
      normalizedEmail === 'yonatan@yonatanelias.dpdns.org'
    ) {
      return true;
    }

    try {
      // Check if email exists in database users table
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.email, normalizedEmail))
        .limit(1);

      return !!existingUser;
    } catch (err) {
      console.warn('Failed to verify user authorization in database:', err);
      return false;
    }
  }

  /**
   * Syncs a Supabase Auth user into the local database users table.
   */
  static async syncUser(supabaseUser: SupabaseUser): Promise<User> {
    const email = (supabaseUser.email || '').toLowerCase().trim();
    const displayName =
      supabaseUser.user_metadata?.full_name ||
      supabaseUser.user_metadata?.name ||
      email.split('@')[0] ||
      'Admin User';

    // 1. Check if user already exists by Supabase Auth ID
    const [existingById] = await db
      .select()
      .from(users)
      .where(eq(users.supabaseAuthId, supabaseUser.id))
      .limit(1);

    if (existingById) {
      return existingById;
    }

    // 2. Check if a pre-authorized or seeded user exists with this email
    if (email) {
      const [existingByEmail] = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (existingByEmail) {
        const [updated] = await db
          .update(users)
          .set({
            supabaseAuthId: supabaseUser.id,
            displayName: displayName || existingByEmail.displayName,
            updatedAt: new Date(),
          })
          .where(eq(users.id, existingByEmail.id))
          .returning();
        return updated;
      }
    }

    // 3. Otherwise, create a new user record
    const [newUser] = await db
      .insert(users)
      .values({
        supabaseAuthId: supabaseUser.id,
        email,
        displayName,
      })
      .returning();

    return newUser;
  }

  /**
   * Retrieves the currently authenticated Supabase user and syncs with the database.
   */
  static async getCurrentUser(): Promise<{ supabaseUser: SupabaseUser; dbUser: User } | null> {
    try {
      const supabase = await createClient();
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) {
        return null;
      }

      const dbUser = await this.syncUser(user);
      return { supabaseUser: user, dbUser };
    } catch {
      return null;
    }
  }

  /**
   * Authenticates user using email and password.
   */
  static async signInWithPassword(email: string, password: string) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.toLowerCase().trim(),
      password,
    });

    if (error) {
      throw new Error(error.message);
    }

    if (data.user) {
      await this.syncUser(data.user);
    }

    return data;
  }

  /**
   * Registers a new administrator user with email and password.
   * Checks database authorized users list before registration.
   */
  static async signUpWithPassword(email: string, password: string, displayName?: string) {
    const normalizedEmail = email.toLowerCase().trim();
    const isAuthorized = await this.isAuthorizedEmail(normalizedEmail);

    if (!isAuthorized) {
      throw new Error(
        `Email "${normalizedEmail}" is not in the authorized administrators list. Please contact the platform owner.`
      );
    }

    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: {
          full_name: displayName || 'Yonatan Elias',
        },
      },
    });

    if (error) {
      throw new Error(error.message);
    }

    if (data.user) {
      await this.syncUser(data.user);
    }

    return data;
  }

  /**
   * Signs out the current user and clears session cookies.
   */
  static async signOut() {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw new Error(error.message);
    }
    return { success: true };
  }

  // ============================================================
  // INVITE SYSTEM
  // ============================================================

  /**
   * Generates a cryptographically secure invite token and stores it in the `userInvites` table.
   */
  static async createInvite(
    email: string,
    role: string = 'admin',
    expiresInHours: number = 24,
    createdById?: string
  ): Promise<UserInvite> {
    const normalizedEmail = email.toLowerCase().trim();
    const token = `inv_${crypto.randomBytes(32).toString('hex')}`;
    const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

    const [invite] = await db
      .insert(userInvites)
      .values({
        email: normalizedEmail,
        token,
        role,
        expiresAt,
        createdById: createdById || null,
      })
      .returning();

    await this.logSecurityEvent(createdById || null, 'invite_created', undefined, undefined, {
      inviteId: invite.id,
      email: normalizedEmail,
      role,
      expiresAt: expiresAt.toISOString(),
    });

    return invite;
  }

  /**
   * Looks up invite by token and verifies it is neither expired nor already used.
   */
  static async validateInvite(token: string): Promise<UserInvite> {
    if (!token || typeof token !== 'string') {
      throw new Error('Invite token is required');
    }

    const [invite] = await db
      .select()
      .from(userInvites)
      .where(eq(userInvites.token, token.trim()))
      .limit(1);

    if (!invite) {
      throw new Error('Invite not found or invalid token');
    }

    if (invite.usedAt) {
      throw new Error('This invite has already been used');
    }

    if (new Date(invite.expiresAt).getTime() < Date.now()) {
      throw new Error('This invite has expired');
    }

    return invite;
  }

  /**
   * Validates invite, creates Supabase Auth user, syncs to local DB, and marks invite as used.
   */
  static async consumeInvite(
    token: string,
    password: string,
    displayName?: string
  ): Promise<{ user: User | SupabaseUser | null; session: SupabaseSession | null }> {
    const invite = await this.validateInvite(token);
    const normalizedEmail = invite.email.toLowerCase().trim();

    const admin = createAdminClient();
    let authUser: SupabaseUser | null = null;

    // 1. Create or ensure user in Supabase Auth via admin client (pre-confirmed)
    const { data: createData, error: createError } = await admin.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: displayName || normalizedEmail.split('@')[0],
        role: invite.role,
      },
    });

    if (createError) {
      // If user already exists in auth, update password and confirm
      if (createError.message?.toLowerCase().includes('already registered')) {
        const { data: listData } = await admin.auth.admin.listUsers();
        const existingAuthUser = listData.users.find(
          (u) => u.email?.toLowerCase() === normalizedEmail
        );
        if (existingAuthUser) {
          const { data: updateData, error: updateError } = await admin.auth.admin.updateUserById(
            existingAuthUser.id,
            {
              password,
              email_confirm: true,
              user_metadata: {
                full_name: displayName || existingAuthUser.user_metadata?.full_name || normalizedEmail.split('@')[0],
                role: invite.role,
              },
            }
          );
          if (updateError) {
            throw new Error(updateError.message);
          }
          authUser = updateData.user;
        } else {
          throw new Error(createError.message);
        }
      } else {
        // Fallback to regular signUp
        const supabase = await createClient();
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: {
            data: {
              full_name: displayName || normalizedEmail.split('@')[0],
            },
          },
        });
        if (signUpError) {
          throw new Error(signUpError.message);
        }
        authUser = signUpData.user;
      }
    } else {
      authUser = createData.user;
    }

    // 2. Establish session via SSR client
    let sessionData: { user: SupabaseUser | null; session: SupabaseSession | null } | null = null;
    try {
      sessionData = await this.signInWithPassword(normalizedEmail, password);
    } catch (signInErr) {
      console.warn('Auto sign-in after invite registration could not complete immediately:', signInErr);
    }

    // 3. Mark invite as used
    await db
      .update(userInvites)
      .set({ usedAt: new Date() })
      .where(eq(userInvites.id, invite.id));

    // 4. Sync user to local database
    let dbUser: User | null = null;
    if (authUser) {
      dbUser = await this.syncUser(authUser);
    } else if (sessionData?.user) {
      dbUser = await this.syncUser(sessionData.user);
    }

    // 5. Audit log
    await this.logSecurityEvent(
      dbUser?.id || null,
      'invite_consumed',
      undefined,
      undefined,
      {
        email: normalizedEmail,
        inviteId: invite.id,
      }
    );

    return {
      user: dbUser || sessionData?.user || authUser,
      session: sessionData?.session || null,
    };
  }

  /**
   * Returns all invites created by this user, ordered by creation date desc.
   */
  static async listInvites(userId?: string): Promise<UserInvite[]> {
    const query = db.select().from(userInvites);
    if (userId) {
      return await query
        .where(eq(userInvites.createdById, userId))
        .orderBy(desc(userInvites.createdAt));
    }
    return await query.orderBy(desc(userInvites.createdAt));
  }

  /**
   * Deletes an unused invite.
   */
  static async revokeInvite(inviteId: string, userId?: string): Promise<{ success: boolean }> {
    const [invite] = await db
      .select()
      .from(userInvites)
      .where(eq(userInvites.id, inviteId))
      .limit(1);

    if (!invite) {
      throw new Error('Invite not found');
    }

    if (invite.usedAt) {
      throw new Error('Cannot revoke an invite that has already been used');
    }

    await db.delete(userInvites).where(eq(userInvites.id, inviteId));

    await this.logSecurityEvent(userId || null, 'invite_revoked', undefined, undefined, {
      inviteId,
      email: invite.email,
    });

    return { success: true };
  }

  // ============================================================
  // PASSWORD MANAGEMENT
  // ============================================================

  /**
   * Updates user password. Can be authenticated via current password OR master TOTP recovery code.
   */
  static async changePassword(
    userId: string,
    newPassword: string,
    currentPassword?: string,
    totpRecoveryCode?: string
  ): Promise<{ success: boolean }> {
    const [dbUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!dbUser) {
      throw new Error('User not found');
    }

    const admin = createAdminClient();

    if (totpRecoveryCode) {
      const isValidTotp = await this.verifyTotpCode(totpRecoveryCode);
      if (!isValidTotp) {
        throw new Error('Invalid master TOTP recovery code');
      }
      // Update directly via Supabase admin client
      const { error: adminUpdateError } = await admin.auth.admin.updateUserById(
        dbUser.supabaseAuthId,
        { password: newPassword }
      );
      if (adminUpdateError) {
        throw new Error(adminUpdateError.message);
      }
      await this.logSecurityEvent(userId, 'password_change', undefined, undefined, {
        method: 'totp_recovery',
      });
      return { success: true };
    }

    if (!currentPassword) {
      throw new Error('Either current password or master TOTP recovery code is required');
    }

    // Verify current password via Supabase
    const supabase = await createClient();
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: dbUser.email,
      password: currentPassword,
    });

    if (verifyError) {
      throw new Error('Current password is incorrect');
    }

    // Update password
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateError) {
      throw new Error(updateError.message);
    }

    await this.logSecurityEvent(userId, 'password_change', undefined, undefined, {
      method: 'self_service',
    });

    return { success: true };
  }

  /**
   * Recovers / resets password using Master TOTP code without requiring existing login.
   */
  static async recoverPasswordWithTotp(
    email: string,
    totpCode: string,
    newPassword: string
  ): Promise<{ success: boolean }> {
    const isValidTotp = await this.verifyTotpCode(totpCode);
    if (!isValidTotp) {
      throw new Error('Invalid master TOTP recovery code');
    }

    const normalizedEmail = email.toLowerCase().trim();

    let [dbUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    const admin = createAdminClient();

    // If not found in local table, check Supabase Auth admin
    if (!dbUser) {
      const { data: listData } = await admin.auth.admin.listUsers();
      const matchedAuthUser = listData?.users?.find(
        (u) => u.email?.toLowerCase().trim() === normalizedEmail
      );
      if (matchedAuthUser) {
        dbUser = await this.syncUser(matchedAuthUser);
      } else {
        // If owner email was used, create the user in Supabase Auth and DB
        if (
          normalizedEmail === 'yonatane504@gmail.com' ||
          normalizedEmail === 'yonatan@yonatanelias.dpdns.org'
        ) {
          const { data: createData, error: createError } = await admin.auth.admin.createUser({
            email: normalizedEmail,
            password: newPassword,
            email_confirm: true,
            user_metadata: {
              full_name: 'Yonatan Elias',
              role: 'admin',
            },
          });
          if (createError) {
            throw new Error(createError.message);
          }
          if (createData.user) {
            dbUser = await this.syncUser(createData.user);
            await this.logSecurityEvent(dbUser.id, 'password_change', undefined, undefined, {
              email: normalizedEmail,
              method: 'unauthenticated_totp_recovery',
              description: 'Owner account provisioned and password set via Master TOTP recovery',
            });
            return { success: true };
          }
        }
        throw new Error(`User with email "${normalizedEmail}" not found in registered accounts.`);
      }
    }

    const { error: adminUpdateError } = await admin.auth.admin.updateUserById(
      dbUser.supabaseAuthId,
      { password: newPassword, email_confirm: true }
    );

    if (adminUpdateError) {
      throw new Error(adminUpdateError.message);
    }

    await this.logSecurityEvent(dbUser.id, 'password_change', undefined, undefined, {
      email: normalizedEmail,
      method: 'unauthenticated_totp_recovery',
      description: 'Password reset via Master TOTP recovery',
    });

    return { success: true };
  }

  /**
   * Admin sets a temporary password for another user and logs security event.
   */
  static async adminForcePasswordReset(
    adminUserId: string,
    targetUserId: string,
    tempPassword?: string
  ): Promise<{ success: boolean; temporaryPassword: string }> {
    const [targetUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, targetUserId))
      .limit(1);

    if (!targetUser) {
      throw new Error('Target user not found');
    }

    const newPassword =
      tempPassword ||
      `Temp_${crypto.randomBytes(6).toString('hex')}!Aa1`;

    const admin = createAdminClient();
    const { error } = await admin.auth.admin.updateUserById(targetUser.supabaseAuthId, {
      password: newPassword,
    });

    if (error) {
      throw new Error(error.message);
    }

    await this.logSecurityEvent(targetUserId, 'admin_password_reset', undefined, undefined, {
      resetBy: adminUserId,
    });

    return { success: true, temporaryPassword: newPassword };
  }

  // ============================================================
  // TOTP MASTER KEY (Break-Glass Access)
  // ============================================================

  /**
   * Generates a 20-byte base32 TOTP secret, stores encrypted secret in appSettings,
   * and returns secret + otpauth:// URI.
   */
  static async generateTotpSecret(): Promise<{ secret: string; uri: string }> {
    const randomBytes = crypto.randomBytes(20);
    const secret = base32Encode(randomBytes);
    const uri = `otpauth://totp/Yonatan%20Profile:Master?secret=${secret}&issuer=Yonatan%20Profile&algorithm=SHA1&digits=6&period=30`;

    const encrypted = encryptSecret(secret);

    await db
      .insert(appSettings)
      .values({
        key: 'MASTER_TOTP_SECRET',
        value: encrypted,
        isSecret: true,
        category: 'auth',
        description: 'Master TOTP Secret for emergency break-glass login',
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: appSettings.key,
        set: {
          value: encrypted,
          updatedAt: new Date(),
        },
      });

    return { secret, uri };
  }

  /**
   * Implements RFC 6238 TOTP verification (HMAC-SHA1, 30-sec window, ±1 step tolerance).
   */
  static async verifyTotpCode(code: string): Promise<boolean> {
    if (!code || typeof code !== 'string') {
      return false;
    }
    const cleanCode = code.trim();
    if (cleanCode.length !== 6 || !/^\d{6}$/.test(cleanCode)) {
      return false;
    }

    const [setting] = await db
      .select()
      .from(appSettings)
      .where(eq(appSettings.key, 'MASTER_TOTP_SECRET'))
      .limit(1);

    if (!setting || !setting.value) {
      return false;
    }

    try {
      const secret = decryptSecret(setting.value);
      const secretBuffer = base32Decode(secret);
      const currentStep = Math.floor(Date.now() / 1000 / 30);

      for (let delta = -1; delta <= 1; delta++) {
        const expected = generateTotpForCounter(secretBuffer, currentStep + delta);
        if (crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(cleanCode))) {
          return true;
        }
      }
      return false;
    } catch (err) {
      console.error('Error verifying TOTP code:', err);
      return false;
    }
  }

  /**
   * Verifies the TOTP code against the master secret.
   * If valid, looks up user by email, creates Supabase admin session, syncs user,
   * logs security event with type 'totp_bypass', and returns session.
   */
  static async loginWithTotp(
    email: string,
    totpCode: string
  ): Promise<{ user: User; session: SupabaseSession | null }> {
    const isValid = await this.verifyTotpCode(totpCode);
    if (!isValid) {
      throw new Error('Invalid TOTP verification code');
    }

    const normalizedEmail = email.toLowerCase().trim();

    let [dbUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    const admin = createAdminClient();

    // If user is not yet in local users table, look up or sync from Supabase Auth
    if (!dbUser) {
      const { data: listData } = await admin.auth.admin.listUsers();
      const matchedAuthUser = listData?.users?.find(
        (u) => u.email?.toLowerCase().trim() === normalizedEmail
      );
      if (matchedAuthUser) {
        dbUser = await this.syncUser(matchedAuthUser);
      } else {
        throw new Error(`User with email "${normalizedEmail}" not found`);
      }
    }

    let session: SupabaseSession | null = null;
    let authUser: SupabaseUser | null = null;

    try {
      // 1. Generate magiclink to produce a token_hash
      const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
        type: 'magiclink',
        email: normalizedEmail,
      });

      const tokenHash =
        (linkData as any)?.properties?.hashed_token ||
        (linkData as any)?.hashed_token;

      console.log(`[TOTP_LOGIN_SERVICE] generateLink for "${normalizedEmail}" | linkError: ${linkError?.message || 'NONE'} | tokenHash: ${tokenHash ? 'FOUND' : 'MISSING'}`);

      if (!linkError && tokenHash) {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
        const supabaseKey =
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
          process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
          process.env.SUPABASE_ANON_KEY ||
          '';

        if (supabaseUrl && supabaseKey) {
          const supabase = createServerClient(supabaseUrl, supabaseKey, {
            cookies: {
              getAll() {
                return [];
              },
              setAll() {
                // In-memory cookie handling
              },
            },
          });

          const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: 'magiclink',
          });

          console.log(`[TOTP_LOGIN_SERVICE] verifyOtp result | verifyError: ${verifyError?.message || 'NONE'} | session: ${verifyData?.session ? 'FOUND' : 'NULL'}`);

          if (!verifyError && verifyData?.session) {
            session = verifyData.session;
            authUser = verifyData.user;
          } else if (verifyError) {
            console.error('[TOTP_LOGIN_SERVICE] Server verifyOtp error:', verifyError.message);
            throw new Error(`Failed to exchange verification token: ${verifyError.message}`);
          }
        } else {
          console.error('[TOTP_LOGIN_SERVICE] Missing Supabase URL or Anon Key in environment!');
          throw new Error('Supabase client environment keys are not configured.');
        }
      } else if (linkError) {
        console.error('[TOTP_LOGIN_SERVICE] Admin generateLink error:', linkError.message);
        throw new Error(`Failed to generate authentication link: ${linkError.message}`);
      }
    } catch (adminErr) {
      console.error('[TOTP_LOGIN_SERVICE] Exception in loginWithTotp session creation:', adminErr);
      if (adminErr instanceof Error) {
        throw adminErr;
      }
      throw new Error('Session creation failed during TOTP login.');
    }

    if (!authUser) {
      const { data: adminUserData } = await admin.auth.admin.getUserById(dbUser.supabaseAuthId);
      authUser = adminUserData?.user || null;
    }

    const syncedUser = authUser ? await this.syncUser(authUser) : dbUser;

    await this.logSecurityEvent(syncedUser.id, 'totp_bypass', undefined, undefined, {
      email: normalizedEmail,
      description: 'Emergency login via Master TOTP bypass',
    });

    return {
      user: syncedUser,
      session,
    };
  }

  // ============================================================
  // SECURITY AUDIT LOGGING
  // ============================================================

  /**
   * Inserts an audit event into the securityEvents table.
   */
  static async logSecurityEvent(
    userId?: string | null,
    eventType: string = 'unknown',
    ipAddress?: string | null,
    userAgent?: string | null,
    metadata?: Record<string, unknown> | null
  ): Promise<SecurityEvent | null> {
    try {
      const [event] = await db
        .insert(securityEvents)
        .values({
          userId: userId || null,
          eventType,
          ipAddress: ipAddress || null,
          userAgent: userAgent || null,
          metadata: metadata || null,
        })
        .returning();
      return event;
    } catch (err) {
      console.error('Failed to log security event:', err);
      return null;
    }
  }

  /**
   * Fetches recent security events with optional user filter.
   */
  static async getSecurityEvents(userId?: string, limit: number = 50) {
    const query = db
      .select({
        id: securityEvents.id,
        userId: securityEvents.userId,
        eventType: securityEvents.eventType,
        ipAddress: securityEvents.ipAddress,
        userAgent: securityEvents.userAgent,
        metadata: securityEvents.metadata,
        createdAt: securityEvents.createdAt,
        userEmail: users.email,
        userDisplayName: users.displayName,
      })
      .from(securityEvents)
      .leftJoin(users, eq(securityEvents.userId, users.id))
      .orderBy(desc(securityEvents.createdAt))
      .limit(limit);

    if (userId) {
      return await query.where(eq(securityEvents.userId, userId));
    }
    return await query;
  }
}
