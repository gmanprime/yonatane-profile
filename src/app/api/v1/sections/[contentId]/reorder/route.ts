import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/services/auth.service';
import { ContentService } from '@/lib/services/content.service';
import { reorderSectionsSchema } from '@/lib/validators/content.validator';

interface RouteContext {
  params: Promise<{ contentId: string }>;
}

export async function PUT(req: NextRequest, context: RouteContext) {
  try {
    const auth = await AuthService.getCurrentUser();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { contentId } = await context.params;
    const body = await req.json();
    const parsed = reorderSectionsSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.issues },
        { status: 400 }
      );
    }

    await ContentService.reorderSections(contentId, parsed.data.sectionIds);
    return NextResponse.json({ success: true, message: 'Sections reordered successfully' });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to reorder sections' },
      { status: 500 }
    );
  }
}
