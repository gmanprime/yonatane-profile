import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/services/auth.service';
import { adminResetPasswordSchema } from '@/lib/validators/auth.validator';
import { getErrorMessage } from '@/lib/utils/error';

export async function POST(req: NextRequest) {
  try {
    const currentUser = await AuthService.getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = adminResetPasswordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid reset parameters', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { userId, temporaryPassword } = parsed.data;
    const result = await AuthService.adminForcePasswordReset(
      currentUser.dbUser.id,
      userId,
      temporaryPassword
    );

    return NextResponse.json({
      success: true,
      message: 'Password reset successfully',
      temporaryPassword: result.temporaryPassword,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(error, 'Failed to reset user password') },
      { status: 500 }
    );
  }
}
