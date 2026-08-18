import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/services/auth.service';
import { ContentService } from '@/lib/services/content.service';
import { reorderSectionItemsSchema } from '@/lib/validators/content.validator';
import { getErrorMessage } from '@/lib/utils/error';

interface RouteContext {
  params: Promise<{ contentId: string; sectionId: string }>;
}

export async function PUT(req: NextRequest, context: RouteContext) {
  try {
    const auth = await AuthService.getCurrentUser();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sectionId } = await context.params;
    const body = await req.json();
    const parsed = reorderSectionItemsSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.issues },
        { status: 400 }
      );
    }

    await ContentService.reorderSectionItems(sectionId, parsed.data.itemIds);

    return NextResponse.json({ success: true, message: 'Section items reordered successfully' });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(error, 'Failed to reorder section items') },
      { status: 500 }
    );
  }
}
