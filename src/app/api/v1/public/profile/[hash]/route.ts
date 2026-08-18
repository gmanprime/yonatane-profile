import { NextRequest, NextResponse } from 'next/server';
import { ProfileService } from '@/lib/services/profile.service';

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
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to resolve public profile' },
      { status: 500 }
    );
  }
}
