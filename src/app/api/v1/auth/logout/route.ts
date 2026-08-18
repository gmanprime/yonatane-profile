import { NextResponse } from 'next/server';
import { AuthService } from '@/lib/services/auth.service';

export async function POST() {
  try {
    await AuthService.signOut();
    return NextResponse.json({ success: true, message: 'Logged out successfully' });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Logout failed' },
      { status: 500 }
    );
  }
}
