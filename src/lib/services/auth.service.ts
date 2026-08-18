import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db';
import { users, type User } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import type { User as SupabaseUser } from '@supabase/supabase-js';

export class AuthService {
  /**
   * Syncs a Supabase Auth user into the local database users table.
   */
  static async syncUser(supabaseUser: SupabaseUser): Promise<User> {
    const existing = await db
      .select()
      .from(users)
      .where(eq(users.supabaseAuthId, supabaseUser.id))
      .limit(1);

    if (existing.length > 0) {
      return existing[0];
    }

    const email = supabaseUser.email || '';
    const displayName =
      supabaseUser.user_metadata?.full_name ||
      supabaseUser.user_metadata?.name ||
      email.split('@')[0] ||
      'Admin User';

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
      email,
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
   * Initiates Google OAuth sign-in flow.
   */
  static async getGoogleOAuthUrl(redirectTo?: string) {
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
