import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/services/auth.service';
import { getErrorMessage } from '@/lib/utils/error';

export async function GET(req: NextRequest) {
  try {
    const currentUser = await AuthService.getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = req.nextUrl;
    const userId = searchParams.get('userId') || undefined;
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? Math.min(Math.max(parseInt(limitParam, 10) || 50, 1), 200) : 50;

    const events = await AuthService.getSecurityEvents(userId, limit);

    return NextResponse.json({
      success: true,
      events,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(error, 'Failed to retrieve security events') },
      { status: 500 }
    );
  }
}
