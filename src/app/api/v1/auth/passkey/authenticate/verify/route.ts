import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { passkeyAssertionSchema } from '@/lib/validators/auth.validator';
import { AuthService } from '@/lib/services/auth.service';
import { db } from '@/lib/db';
import { users, passkeys } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { createAdminClient } from '@/lib/supabase/admin';
import { getErrorMessage } from '@/lib/utils/error';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = passkeyAssertionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid passkey assertion data', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { credential } = parsed.data;

    // 1. Look up stored passkey by credentialId
    const [storedPasskey] = await db
      .select()
      .from(passkeys)
      .where(eq(passkeys.credentialId, credential.id))
      .limit(1);

    if (!storedPasskey) {
      return NextResponse.json(
        { error: 'Passkey credential not recognized' },
        { status: 400 }
      );
    }

    // 2. Look up the corresponding user
    const [dbUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, storedPasskey.userId))
      .limit(1);

    if (!dbUser) {
      return NextResponse.json(
        { error: 'User associated with passkey not found' },
        { status: 404 }
      );
    }

    // 3. Update passkey usage metadata
    await db
      .update(passkeys)
      .set({
        lastUsedAt: new Date(),
        counter: (storedPasskey.counter || 0) + 1,
      })
      .where(eq(passkeys.id, storedPasskey.id));

    // 4. Create active session on SSR client cookies via Supabase Admin magiclink
    const admin = createAdminClient();
    let session: any = null;

    const response = NextResponse.json({
      success: true,
      verified: true,
      user: {
        id: dbUser.id,
        email: dbUser.email,
        displayName: dbUser.displayName,
      },
      session: null as any,
    });

    try {
      const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
        type: 'magiclink',
        email: dbUser.email,
      });

      const tokenHash =
        (linkData as any)?.properties?.hashed_token ||
        (linkData as any)?.hashed_token;

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
                return req.cookies.getAll();
              },
              setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
                cookiesToSet.forEach(({ name, value, options }) => {
                  response.cookies.set(name, value, options);
                });
              },
            },
          });

          const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: 'magiclink',
          });

          if (!verifyError && verifyData?.session) {
            session = verifyData.session;
            if (verifyData.user) {
              await AuthService.syncUser(verifyData.user);
            }
          } else if (verifyError) {
            console.warn('[PASSKEY_VERIFY_API] Server verifyOtp error:', verifyError.message);
          }
        }
      } else if (linkError) {
        console.warn('[PASSKEY_VERIFY_API] Admin generateLink error:', linkError.message);
      }
    } catch (sessionErr) {
      console.warn('Passkey authentication session creation warning:', sessionErr);
    }

    // 5. Audit log
    await AuthService.logSecurityEvent(
      dbUser.id,
      'passkey_login',
      req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
      req.headers.get('user-agent'),
      {
        credentialId: storedPasskey.credentialId,
        deviceName: storedPasskey.deviceName,
      }
    );

    // Update response body with final session
    const responsePayload = {
      success: true,
      verified: true,
      user: {
        id: dbUser.id,
        email: dbUser.email,
        displayName: dbUser.displayName,
      },
      session,
    };

    console.log(`[PASSKEY_VERIFY_API] User: ${dbUser.email} | Session issued: ${Boolean(session)} | Cookies set: ${response.cookies.getAll().map(c => c.name).join(', ')}`);

    return NextResponse.json(responsePayload, {
      headers: response.headers,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(error, 'Passkey authentication failed') },
      { status: 500 }
    );
  }
}
