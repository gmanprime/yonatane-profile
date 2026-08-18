import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/services/auth.service';
import { getErrorMessage } from '@/lib/utils/error';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const redirectTo = searchParams.get('redirectTo') || undefined;

    const url = await AuthService.getGoogleOAuthUrl(redirectTo);
    return NextResponse.redirect(url);
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(error, 'Failed to initiate Google OAuth') },
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
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(error, 'Failed to initiate Google OAuth') },
      { status: 500 }
    );
  }
}
