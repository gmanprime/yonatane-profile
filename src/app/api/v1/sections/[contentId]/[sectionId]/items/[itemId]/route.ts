import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/services/auth.service';
import { ContentService } from '@/lib/services/content.service';
import { updateSectionItemSchema } from '@/lib/validators/content.validator';
import { getErrorMessage } from '@/lib/utils/error';

interface RouteContext {
  params: Promise<{ contentId: string; sectionId: string; itemId: string }>;
}

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const auth = await AuthService.getCurrentUser();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { itemId } = await context.params;
    const item = await ContentService.getSectionItemById(itemId);

    if (!item) {
      return NextResponse.json({ error: 'Section item not found' }, { status: 404 });
    }

    return NextResponse.json({ item });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(error, 'Failed to retrieve section item') },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest, context: RouteContext) {
  try {
    const auth = await AuthService.getCurrentUser();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { itemId } = await context.params;
    const body = await req.json();
    const parsed = updateSectionItemSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const updated = await ContentService.updateSectionItem(itemId, parsed.data);

    if (!updated) {
      return NextResponse.json({ error: 'Section item not found' }, { status: 404 });
    }

    return NextResponse.json({ item: updated });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(error, 'Failed to update section item') },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const auth = await AuthService.getCurrentUser();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { itemId } = await context.params;
    const deleted = await ContentService.deleteSectionItem(itemId);

    if (!deleted) {
      return NextResponse.json({ error: 'Section item not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Section item deleted successfully' });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(error, 'Failed to delete section item') },
      { status: 500 }
    );
  }
}
