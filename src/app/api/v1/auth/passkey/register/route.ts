import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { AuthService } from '@/lib/services/auth.service';
import { db } from '@/lib/db';
import { passkeys } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getErrorMessage } from '@/lib/utils/error';

export async function POST(req: NextRequest) {
  try {
    const currentUser = await AuthService.getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const existingUserPasskeys = await db
      .select({ credentialId: passkeys.credentialId })
      .from(passkeys)
      .where(eq(passkeys.userId, currentUser.dbUser.id));

    const challenge = Buffer.from(crypto.randomBytes(32)).toString('base64url');
    const userHandle = Buffer.from(currentUser.dbUser.id).toString('base64url');

    const options = {
      challenge,
      rp: {
        name: 'Yonatan Elias Profile & Portfolio',
        id: req.nextUrl.hostname,
      },
      user: {
        id: userHandle,
        name: currentUser.dbUser.email,
        displayName: currentUser.dbUser.displayName || currentUser.dbUser.email,
      },
      pubKeyCredParams: [
        { alg: -7, type: 'public-key' as const }, // ES256
        { alg: -257, type: 'public-key' as const }, // RS256
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform' as const,
        userVerification: 'preferred' as const,
        residentKey: 'preferred' as const,
      },
      excludeCredentials: existingUserPasskeys.map((pk) => ({
        id: pk.credentialId,
        type: 'public-key' as const,
      })),
      timeout: 60000,
      attestation: 'none' as const,
    };

    return NextResponse.json({ options });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(error, 'Failed to generate passkey registration options') },
      { status: 500 }
    );
  }
}
