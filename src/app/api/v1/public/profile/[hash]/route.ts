import { NextRequest, NextResponse } from 'next/server';
import { ProfileService } from '@/lib/services/profile.service';
import { getErrorMessage } from '@/lib/utils/error';

interface RouteContext {
  params: Promise<{ hash: string }>;
}

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const { hash } = await context.params;
    const resolvedProfile = await ProfileService.getResolvedProfile(hash);

    if (!resolvedProfile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: resolvedProfile,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(error, 'Failed to resolve public profile') },
      { status: 500 }
    );
  }
}
