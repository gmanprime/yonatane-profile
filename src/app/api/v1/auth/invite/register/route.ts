import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/services/auth.service';
import { inviteRegisterSchema } from '@/lib/validators/auth.validator';
import { getErrorMessage } from '@/lib/utils/error';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = inviteRegisterSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid registration details', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { token, password, displayName } = parsed.data;
    const result = await AuthService.consumeInvite(token, password, displayName);

    return NextResponse.json({
      success: true,
      message: 'Account registered successfully',
      user: result.user,
      session: result.session,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(error, 'Registration failed') },
      { status: 400 }
    );
  }
}
