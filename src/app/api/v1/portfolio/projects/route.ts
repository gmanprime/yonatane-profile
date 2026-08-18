import { NextResponse } from 'next/server';
import { AuthService } from '@/lib/services/auth.service';
import { PortfolioService } from '@/lib/services/portfolio.service';
import { getErrorMessage } from '@/lib/utils/error';

export async function GET() {
  try {
    const auth = await AuthService.getCurrentUser();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const projects = await PortfolioService.getProjectItems(auth.dbUser.id);
    return NextResponse.json({ projects });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(error, 'Failed to fetch project section items') },
      { status: 500 }
    );
  }
}
