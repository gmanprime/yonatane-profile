import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/services/auth.service';
import { ContentService } from '@/lib/services/content.service';
import {
  updateSectionSchema,
  createSectionItemSchema,
} from '@/lib/validators/content.validator';

interface RouteContext {
  params: Promise<{ contentId: string; sectionId: string }>;
}

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const auth = await AuthService.getCurrentUser();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sectionId } = await context.params;
    const section = await ContentService.getSectionById(sectionId);

    if (!section) {
      return NextResponse.json({ error: 'Section not found' }, { status: 404 });
    }

    return NextResponse.json({ section });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to retrieve section' },
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

    const { sectionId } = await context.params;
    const body = await req.json();
    const parsed = updateSectionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const updated = await ContentService.updateSection(sectionId, parsed.data);

    if (!updated) {
      return NextResponse.json({ error: 'Section not found' }, { status: 404 });
    }

    return NextResponse.json({ section: updated });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to update section' },
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

    const { sectionId } = await context.params;
    const deleted = await ContentService.deleteSection(sectionId);

    if (!deleted) {
      return NextResponse.json({ error: 'Section not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Section deleted successfully' });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to delete section' },
      { status: 500 }
    );
  }
}

// Create an item inside this section
export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const auth = await AuthService.getCurrentUser();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sectionId } = await context.params;
    const body = await req.json();
    const parsed = createSectionItemSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const item = await ContentService.createSectionItem(sectionId, parsed.data);
    return NextResponse.json({ item }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to create section item' },
      { status: 500 }
    );
  }
}
