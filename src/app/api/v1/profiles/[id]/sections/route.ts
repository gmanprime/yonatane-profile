import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/services/auth.service';
import { ProfileService } from '@/lib/services/profile.service';
import { updateProfileSectionsSchema } from '@/lib/validators/profile.validator';
import { getErrorMessage } from '@/lib/utils/error';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const auth = await AuthService.getCurrentUser();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const sections = await ProfileService.getProfileSections(id);

    return NextResponse.json({ sections });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(error, 'Failed to retrieve profile sections') },
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

    const { id } = await context.params;
    const body = await req.json();
    const parsed = updateProfileSectionsSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.issues },
        { status: 400 }
      );
    }

    await ProfileService.updateProfileSections(id, parsed.data.sections);
    return NextResponse.json({ success: true, message: 'Profile sections updated successfully' });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(error, 'Failed to update profile sections') },
      { status: 500 }
    );
  }
}
