import { NextRequest, NextResponse } from 'next/server';
import { AnalyticsService } from '@/lib/services/analytics.service';
import { getErrorMessage } from '@/lib/utils/error';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { profileId, screenWidth, screenHeight, referrer } = body;

    if (!profileId) {
      return NextResponse.json({ error: 'profileId is required' }, { status: 400 });
    }

    const userAgent = req.headers.get('user-agent') || undefined;
    const ipAddress =
      req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      req.headers.get('x-real-ip') ||
      undefined;

    const record = await AnalyticsService.logVisit(profileId, {
      userAgent,
      ipAddress,
      referrer: referrer || req.headers.get('referer') || undefined,
      screenWidth: screenWidth ? parseInt(screenWidth, 10) : undefined,
      screenHeight: screenHeight ? parseInt(screenHeight, 10) : undefined,
    });

    return NextResponse.json({ success: true, id: record.id });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(error, 'Failed to record visit telemetry') },
      { status: 500 }
    );
  }
}
