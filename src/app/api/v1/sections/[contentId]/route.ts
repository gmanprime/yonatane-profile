import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/services/auth.service';
import { ContentService } from '@/lib/services/content.service';
import { createSectionSchema } from '@/lib/validators/content.validator';

interface RouteContext {
  params: Promise<{ contentId: string }>;
}

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const auth = await AuthService.getCurrentUser();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { contentId } = await context.params;
    const sections = await ContentService.getSections(contentId);

    return NextResponse.json({ sections });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to retrieve sections' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const auth = await AuthService.getCurrentUser();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { contentId } = await context.params;
    const body = await req.json();
    const parsed = createSectionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const section = await ContentService.createSection(contentId, parsed.data);
    return NextResponse.json({ section }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to create section' },
      { status: 500 }
    );
  }
}
