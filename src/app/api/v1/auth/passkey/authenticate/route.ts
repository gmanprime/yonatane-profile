import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { db } from '@/lib/db';
import { users, passkeys } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getErrorMessage } from '@/lib/utils/error';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = typeof body?.email === 'string' ? body.email.toLowerCase().trim() : undefined;

    let targetPasskeys: { credentialId: string; transports: string | null }[] = [];

    if (email) {
      const [user] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (user) {
        targetPasskeys = await db
          .select({ credentialId: passkeys.credentialId, transports: passkeys.transports })
          .from(passkeys)
          .where(eq(passkeys.userId, user.id));
      }
    } else {
      // If no email hint, provide all known passkeys (or passkey resident keys can match)
      targetPasskeys = await db
        .select({ credentialId: passkeys.credentialId, transports: passkeys.transports })
        .from(passkeys)
        .limit(20);
    }

    const challenge = Buffer.from(crypto.randomBytes(32)).toString('base64url');

    const allowCredentials = targetPasskeys.map((pk) => {
      let transports: string[] | undefined;
      if (pk.transports) {
        try {
          transports = JSON.parse(pk.transports);
        } catch {
          // ignore parsing error
        }
      }
      return {
        id: pk.credentialId,
        type: 'public-key' as const,
        transports,
      };
    });

    const options = {
      challenge,
      timeout: 60000,
      rpId: req.nextUrl.hostname,
      userVerification: 'preferred' as const,
      allowCredentials,
    };

    return NextResponse.json({ options });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(error, 'Failed to generate passkey assertion options') },
      { status: 500 }
    );
  }
}
