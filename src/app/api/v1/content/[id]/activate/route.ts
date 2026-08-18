import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/services/auth.service';
import { ContentService } from '@/lib/services/content.service';
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
    const success = await ContentService.setPrimaryDataset(id, auth.dbUser.id);

    if (!success) {
      return NextResponse.json({ error: 'Dataset not found or could not be activated' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Dataset activated as primary profile content' });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(error, 'Failed to activate dataset') },
      { status: 500 }
    );
  }
}
