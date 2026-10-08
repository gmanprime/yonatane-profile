import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/services/auth.service';
import { changePasswordSchema } from '@/lib/validators/auth.validator';
import { getErrorMessage } from '@/lib/utils/error';

export async function PUT(req: NextRequest) {
  try {
    const currentUser = await AuthService.getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = changePasswordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid password details', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { currentPassword, totpRecoveryCode, newPassword } = parsed.data;
    await AuthService.changePassword(
      currentUser.dbUser.id,
      newPassword,
      currentPassword,
      totpRecoveryCode
    );

    return NextResponse.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(error, 'Failed to change password') },
      { status: 400 }
    );
  }
}
