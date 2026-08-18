import { NextResponse } from 'next/server';
import { AuthService } from '@/lib/services/auth.service';
import { AnalyticsService } from '@/lib/services/analytics.service';
import { getErrorMessage } from '@/lib/utils/error';

export async function GET() {
  try {
    const auth = await AuthService.getCurrentUser();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const summary = await AnalyticsService.getOverallAnalytics(auth.dbUser.id);
    return NextResponse.json({ analytics: summary });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(error, 'Failed to retrieve analytics overview') },
      { status: 500 }
    );
  }
}
