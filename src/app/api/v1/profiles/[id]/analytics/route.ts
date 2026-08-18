import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/services/auth.service';
import { AnalyticsService } from '@/lib/services/analytics.service';
import { analyticsQuerySchema } from '@/lib/validators/analytics.validator';
import { getErrorMessage } from '@/lib/utils/error';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const auth = await AuthService.getCurrentUser();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const url = new URL(req.url);
    const queryParams = {
      startDate: url.searchParams.get('startDate') || undefined,
      endDate: url.searchParams.get('endDate') || undefined,
      limit: url.searchParams.get('limit') ? parseInt(url.searchParams.get('limit')!, 10) : undefined,
      offset: url.searchParams.get('offset') ? parseInt(url.searchParams.get('offset')!, 10) : undefined,
    };

    const parsed = analyticsQuerySchema.safeParse(queryParams);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const analytics = await AnalyticsService.getProfileAnalytics(id, auth.dbUser.id, parsed.data);
    return NextResponse.json({ analytics });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(error, 'Failed to retrieve analytics') },
      { status: 500 }
    );
  }
}
