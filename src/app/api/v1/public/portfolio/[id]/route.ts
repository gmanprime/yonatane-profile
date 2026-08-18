import { NextRequest, NextResponse } from 'next/server';
import { PortfolioService } from '@/lib/services/portfolio.service';

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
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to retrieve public portfolio item' },
      { status: 500 }
    );
  }
}
