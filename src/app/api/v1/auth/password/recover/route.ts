import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/services/auth.service';
import { recoverPasswordWithTotpSchema } from '@/lib/validators/auth.validator';
import { getErrorMessage } from '@/lib/utils/error';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = recoverPasswordWithTotpSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid password recovery details', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { email, totpCode, newPassword } = parsed.data;
    await AuthService.recoverPasswordWithTotp(email, totpCode, newPassword);

    return NextResponse.json({
      success: true,
      message: 'Password reset successfully. You can now log in with your new password.',
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(error, 'Password recovery failed') },
      { status: 400 }
    );
  }
}
