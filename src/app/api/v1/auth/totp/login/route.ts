import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/services/auth.service';
import { loginWithTotpSchema } from '@/lib/validators/auth.validator';
import { getErrorMessage } from '@/lib/utils/error';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = loginWithTotpSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid login details', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { email, totpCode } = parsed.data;
    const result = await AuthService.loginWithTotp(email, totpCode);

    return NextResponse.json({
      success: true,
      user: {
        id: result.user.id,
        email: result.user.email,
        displayName: result.user.displayName,
      },
      session: result.session,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(error, 'TOTP login failed') },
      { status: 401 }
    );
  }
}
