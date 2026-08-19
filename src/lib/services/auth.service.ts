import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db';
import { users, type User } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import type { User as SupabaseUser } from '@supabase/supabase-js';

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
   * Initiates Google OAuth sign-in flow.
   */
  static async getGoogleOAuthUrl(redirectTo?: string) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('placeholder.supabase.co')) {
      throw new Error(
        'Google OAuth requires configured Supabase credentials. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local file.'
      );
    }

    const supabase = await createClient();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const callbackUrl = redirectTo || `${siteUrl}/api/v1/auth/callback`;

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: callbackUrl,
      },
    });

    if (error) {
      throw new Error(error.message);
    }

    return data.url;
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
}
