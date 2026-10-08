import { NextRequest, NextResponse } from 'next/server';
import { passkeyVerifySchema } from '@/lib/validators/auth.validator';
import { AuthService } from '@/lib/services/auth.service';
import { db } from '@/lib/db';
import { passkeys } from '@/lib/db/schema';
import { getErrorMessage } from '@/lib/utils/error';

export async function POST(req: NextRequest) {
  try {
    const currentUser = await AuthService.getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = passkeyVerifySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid passkey credential payload', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { credential, deviceName } = parsed.data;

    const credentialId = (credential.id || credential.rawId) as string | undefined;
    if (!credentialId || typeof credentialId !== 'string') {
      return NextResponse.json(
        { error: 'Credential ID is required' },
        { status: 400 }
      );
    }

    const responseObj = (credential.response || {}) as Record<string, unknown>;
    const rawPublicKey =
      responseObj.publicKey ||
      credential.publicKey ||
      responseObj.attestationObject ||
      credentialId;

    const rawTransports =
      responseObj.transports ||
      credential.transports ||
      null;

    const publicKeyStr =
      typeof rawPublicKey === 'string'
        ? rawPublicKey
        : JSON.stringify(rawPublicKey);

    const transportsStr = rawTransports
      ? typeof rawTransports === 'string'
        ? rawTransports
        : JSON.stringify(rawTransports)
      : null;

    const [savedPasskey] = await db
      .insert(passkeys)
      .values({
        userId: currentUser.dbUser.id,
        credentialId,
        publicKey: publicKeyStr,
        counter: 0,
        transports: transportsStr,
        deviceName: deviceName || 'Security Key',
      })
      .onConflictDoUpdate({
        target: passkeys.credentialId,
        set: {
          publicKey: publicKeyStr,
          transports: transportsStr,
          deviceName: deviceName || 'Security Key',
        },
      })
      .returning();

    await AuthService.logSecurityEvent(
      currentUser.dbUser.id,
      'passkey_registered',
      req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
      req.headers.get('user-agent'),
      {
        credentialId,
        deviceName: deviceName || 'Security Key',
      }
    );

    return NextResponse.json({
      success: true,
      verified: true,
      passkey: savedPasskey,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(error, 'Passkey registration verification failed') },
      { status: 500 }
    );
  }
}
