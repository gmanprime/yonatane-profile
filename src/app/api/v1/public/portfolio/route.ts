import { NextRequest, NextResponse } from 'next/server';
import { PortfolioService } from '@/lib/services/portfolio.service';
import { getErrorMessage } from '@/lib/utils/error';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tag = searchParams.get('tag') || undefined;
    const search = searchParams.get('search') || undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 50;
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!, 10) : 0;

    const items = await PortfolioService.getPublicPortfolioItems({
      tag,
      search,
      limit,
      offset,
    });

    return NextResponse.json({
      success: true,
      data: items,
      total: items.length,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(error, 'Failed to fetch public portfolio items') },
      { status: 500 }
    );
  }
}
