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
    let customName: string | undefined = undefined;

    try {
      const body = await req.json();
      if (body && typeof body.name === 'string') {
        customName = body.name;
      }
    } catch {
      // Body is optional
    }

    const duplicated = await ContentService.duplicateDataset(id, auth.dbUser.id, customName);

    if (!duplicated) {
      return NextResponse.json({ error: 'Dataset not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, dataset: duplicated }, { status: 201 });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(error, 'Failed to duplicate dataset') },
      { status: 500 }
    );
  }
}
