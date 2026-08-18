import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/services/auth.service';
import { PortfolioService } from '@/lib/services/portfolio.service';
import { createPortfolioItemSchema } from '@/lib/validators/portfolio.validator';

export async function GET(req: NextRequest) {
  try {
    const auth = await AuthService.getCurrentUser();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(req.url);
    const statusParam = url.searchParams.get('status');
    const status = statusParam === 'published' || statusParam === 'draft' ? statusParam : undefined;
    const limit = url.searchParams.get('limit') ? parseInt(url.searchParams.get('limit')!, 10) : undefined;
    const offset = url.searchParams.get('offset') ? parseInt(url.searchParams.get('offset')!, 10) : undefined;

    const items = await PortfolioService.getPortfolioItems(auth.dbUser.id, {
      status,
      limit,
      offset,
    });

    return NextResponse.json({ items });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to retrieve portfolio items' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await AuthService.getCurrentUser();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = createPortfolioItemSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const item = await PortfolioService.createPortfolioItem(auth.dbUser.id, parsed.data);
    return NextResponse.json({ item }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to create portfolio item' },
      { status: 500 }
    );
  }
}
