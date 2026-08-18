import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/services/auth.service';
import { PortfolioService } from '@/lib/services/portfolio.service';
import { getErrorMessage } from '@/lib/utils/error';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const auth = await AuthService.getCurrentUser();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const item = await PortfolioService.duplicatePortfolioItem(id, auth.dbUser.id);

    if (!item) {
      return NextResponse.json({ error: 'Portfolio item not found or could not be duplicated' }, { status: 404 });
    }

    return NextResponse.json({ item }, { status: 201 });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(error, 'Failed to duplicate portfolio item') },
      { status: 500 }
    );
  }
}
