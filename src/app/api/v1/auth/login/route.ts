import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/services/auth.service';
import { loginSchema } from '@/lib/validators/auth.validator';
import { getErrorMessage } from '@/lib/utils/error';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;
    const result = await AuthService.signInWithPassword(email, password);

    return NextResponse.json({
      success: true,
      user: {
        id: result.user?.id,
        email: result.user?.email,
      },
      session: result.session,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(error, 'Authentication failed') },
      { status: 401 }
    );
  }
}
