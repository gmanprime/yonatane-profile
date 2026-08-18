import { NextRequest, NextResponse } from 'next/server';
import { PortfolioService } from '@/lib/services/portfolio.service';
import { getErrorMessage } from '@/lib/utils/error';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const item = await PortfolioService.getPublicPortfolioItem(id);

    if (!item) {
      return NextResponse.json(
        { error: 'Portfolio item not found or not published' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: item,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(error, 'Failed to retrieve public portfolio item') },
      { status: 500 }
    );
  }
}
