import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/services/auth.service';
import { PortfolioService } from '@/lib/services/portfolio.service';
import { getErrorMessage } from '@/lib/utils/error';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    const auth = await AuthService.getCurrentUser();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { itemId } = await params;
    const links = await PortfolioService.getArticlesForSectionItem(itemId);

    return NextResponse.json({ links });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(error, 'Failed to get articles for project') },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    const auth = await AuthService.getCurrentUser();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { itemId } = await params;
    const body = await req.json();
    const { portfolioItemId, isPrimary } = body;

    if (!portfolioItemId) {
      return NextResponse.json({ error: 'portfolioItemId is required' }, { status: 400 });
    }

    const link = await PortfolioService.linkArticleToProject(itemId, portfolioItemId, isPrimary);

    return NextResponse.json({ link }, { status: 201 });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(error, 'Failed to link article to project') },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    const auth = await AuthService.getCurrentUser();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { itemId } = await params;
    const body = await req.json();
    const { portfolioItemId } = body;

    if (!portfolioItemId) {
      return NextResponse.json({ error: 'portfolioItemId is required' }, { status: 400 });
    }

    await PortfolioService.unlinkArticleFromProject(itemId, portfolioItemId);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(error, 'Failed to unlink article from project') },
      { status: 500 }
    );
  }
}
