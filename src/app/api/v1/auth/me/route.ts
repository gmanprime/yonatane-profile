import { NextResponse } from 'next/server';
import { AuthService } from '@/lib/services/auth.service';

export async function GET() {
  try {
    const userContext = await AuthService.getCurrentUser();

    if (!userContext) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      user: {
        id: userContext.dbUser.id,
        supabaseAuthId: userContext.dbUser.supabaseAuthId,
        email: userContext.dbUser.email,
        displayName: userContext.dbUser.displayName,
        createdAt: userContext.dbUser.createdAt,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch user' },
      { status: 500 }
    );
  }
}
