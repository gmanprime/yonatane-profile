import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/services/auth.service';
import { ThemeService } from '@/lib/services/theme.service';
import { updateThemeSchema } from '@/lib/validators/theme.validator';
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
    const theme = await ThemeService.getThemeById(id, auth.dbUser.id);

    if (!theme) {
      return NextResponse.json({ error: 'Theme not found' }, { status: 404 });
    }

    return NextResponse.json({ theme });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(error, 'Failed to retrieve theme') },
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
    const parsed = updateThemeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const updated = await ThemeService.updateTheme(id, auth.dbUser.id, parsed.data);

    if (!updated) {
      return NextResponse.json({ error: 'Theme not found' }, { status: 404 });
    }

    return NextResponse.json({ theme: updated });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(error, 'Failed to update theme') },
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

    const { id } = await context.params;
    const deleted = await ThemeService.deleteTheme(id, auth.dbUser.id);

    if (!deleted) {
      return NextResponse.json({ error: 'Theme not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Theme deleted successfully' });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(error, 'Failed to delete theme') },
      { status: 500 }
    );
  }
}
