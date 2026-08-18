import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/services/auth.service';
import { ThemeService } from '@/lib/services/theme.service';
import { createThemeSchema } from '@/lib/validators/theme.validator';

export async function GET() {
  try {
    const auth = await AuthService.getCurrentUser();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const themeList = await ThemeService.getThemes(auth.dbUser.id);
    return NextResponse.json({ themes: themeList });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to retrieve themes' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await AuthService.getCurrentUser();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = createThemeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const theme = await ThemeService.createTheme(auth.dbUser.id, parsed.data);
    return NextResponse.json({ theme }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to create theme' },
      { status: 500 }
    );
  }
}
