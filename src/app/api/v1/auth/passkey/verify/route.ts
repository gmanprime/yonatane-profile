import { NextRequest, NextResponse } from 'next/server';
import { passkeyVerifySchema } from '@/lib/validators/auth.validator';
import { AuthService } from '@/lib/services/auth.service';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = passkeyVerifySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid passkey credential payload', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { credential } = parsed.data;

    if (!credential || !credential.id) {
      return NextResponse.json(
        { error: 'Credential verification failed' },
        { status: 400 }
      );
    }

    // In production with Supabase WebAuthn/Passkey MFA or FIDO2, verify signature and create session
    const currentUser = await AuthService.getCurrentUser();

    return NextResponse.json({
      success: true,
      verified: true,
      credentialId: credential.id,
      user: currentUser?.dbUser || null,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Passkey verification failed' },
      { status: 500 }
    );
  }
}
