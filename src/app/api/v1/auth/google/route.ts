import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/services/auth.service';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const redirectTo = searchParams.get('redirectTo') || undefined;

    const url = await AuthService.getGoogleOAuthUrl(redirectTo);
    return NextResponse.redirect(url);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to initiate Google OAuth' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const redirectTo = body.redirectTo || undefined;

    const url = await AuthService.getGoogleOAuthUrl(redirectTo);
    return NextResponse.json({ url });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to initiate Google OAuth' },
      { status: 500 }
    );
  }
}
