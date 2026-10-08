import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/services/auth.service';
import { getErrorMessage } from '@/lib/utils/error';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function DELETE(
  _req: NextRequest,
  { params }: RouteParams
) {
  try {
    const currentUser = await AuthService.getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Invite ID is required' }, { status: 400 });
    }

    await AuthService.revokeInvite(id, currentUser.dbUser.id);

    return NextResponse.json({
      success: true,
      message: 'Invite revoked successfully',
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(error, 'Failed to revoke invite') },
      { status: 500 }
    );
  }
}
