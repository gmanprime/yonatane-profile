import { NextResponse } from 'next/server';
import { AuthService } from '@/lib/services/auth.service';
import { getErrorMessage } from '@/lib/utils/error';

export async function POST() {
  try {
    await AuthService.signOut();
    return NextResponse.json({ success: true, message: 'Logged out successfully' });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(error, 'Logout failed') },
      { status: 500 }
    );
  }
}
