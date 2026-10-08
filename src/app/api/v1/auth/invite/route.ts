import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/services/auth.service';
import { createInviteSchema } from '@/lib/validators/auth.validator';
import { getErrorMessage } from '@/lib/utils/error';

export async function POST(req: NextRequest) {
  try {
    const currentUser = await AuthService.getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = createInviteSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid invite parameters', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { email, role, expiresInHours } = parsed.data;
    const invite = await AuthService.createInvite(
      email,
      role,
      expiresInHours,
      currentUser.dbUser.id
    );

    return NextResponse.json({
      success: true,
      invite,
      token: invite.token,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(error, 'Failed to create invite') },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const currentUser = await AuthService.getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const invites = await AuthService.listInvites(currentUser.dbUser.id);

    return NextResponse.json({
      success: true,
      invites,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(error, 'Failed to list invites') },
      { status: 500 }
    );
  }
}
