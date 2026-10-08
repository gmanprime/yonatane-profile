import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/services/auth.service';
import { getErrorMessage } from '@/lib/utils/error';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { token } = body;

    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { error: 'Invite token is required' },
        { status: 400 }
      );
    }

    const invite = await AuthService.validateInvite(token);

    return NextResponse.json({
      success: true,
      valid: true,
      email: invite.email,
      role: invite.role,
      expiresAt: invite.expiresAt,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(error, 'Invalid or expired invite token') },
      { status: 400 }
    );
  }
}
