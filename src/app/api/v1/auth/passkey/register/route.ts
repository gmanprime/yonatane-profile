import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { passkeyRegisterOptionsSchema } from '@/lib/validators/auth.validator';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const body = await req.json().catch(() => ({}));
    const parsed = passkeyRegisterOptionsSchema.safeParse(body);

    const email = user?.email || (parsed.success ? parsed.data.email : undefined);

    // Generate WebAuthn challenge & registration options
    const challenge = Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64url');
    const userId = user?.id || crypto.randomUUID();

    const options = {
      challenge,
      rp: {
        name: 'Yonatan Elias Profile & Portfolio',
        id: req.nextUrl.hostname,
      },
      user: {
        id: Buffer.from(userId).toString('base64url'),
        name: email || 'user@example.com',
        displayName: user?.user_metadata?.full_name || email || 'User',
      },
      pubKeyCredParams: [
        { alg: -7, type: 'public-key' }, // ES256
        { alg: -257, type: 'public-key' }, // RS256
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'preferred',
        residentKey: 'preferred',
      },
      timeout: 60000,
      attestation: 'none',
    };

    return NextResponse.json({ options });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to generate passkey options' },
      { status: 500 }
    );
  }
}
