import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/services/auth.service';
import { registerSchema } from '@/lib/validators/auth.validator';
import { getErrorMessage } from '@/lib/utils/error';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid registration input', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { email, password, displayName } = parsed.data;
    const result = await AuthService.signUpWithPassword(email, password, displayName);

    return NextResponse.json({
      success: true,
      user: {
        id: result.user?.id,
        email: result.user?.email,
      },
      session: result.session,
      message: result.session
        ? 'Account registered successfully.'
        : 'Registration initiated. Please check your email to confirm your account.',
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(error, 'Registration failed') },
      { status: 400 }
    );
  }
}
