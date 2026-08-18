import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/services/auth.service';
import { AnalyticsService } from '@/lib/services/analytics.service';
import { getErrorMessage } from '@/lib/utils/error';

export async function GET(req: NextRequest) {
  try {
    const auth = await AuthService.getCurrentUser();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const profileId = searchParams.get('profileId') || undefined;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const search = searchParams.get('search') || undefined;

    const csvContent = await AnalyticsService.exportAnalyticsCSV({
      userId: auth.dbUser.id,
      profileId,
      startDate,
      endDate,
      search,
    });

    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = profileId
      ? `stealth-telemetry-profile-${timestamp}.csv`
      : `stealth-telemetry-all-${timestamp}.csv`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(error, 'Failed to export analytics CSV') },
      { status: 500 }
    );
  }
}
