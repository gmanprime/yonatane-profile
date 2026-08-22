import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/services/auth.service';
import { SettingsService } from '@/lib/services/settings.service';
import { getErrorMessage } from '@/lib/utils/error';

export async function GET(req: NextRequest) {
  try {
    const auth = await AuthService.getCurrentUser();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const reveal = searchParams.get('reveal') === 'true';

    // Auto-bootstrap any non-essential keys present in environment
    await SettingsService.bootstrapFromEnv();

    const settings = await SettingsService.getAll(!reveal);

    return NextResponse.json({
      success: true,
      settings,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(error, 'Failed to fetch settings') },
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
    const { key, value, isSecret, category, description } = body;

    if (!key || typeof key !== 'string') {
      return NextResponse.json({ error: 'Key is required and must be a string' }, { status: 400 });
    }

    if (value === undefined || value === null) {
      return NextResponse.json({ error: 'Value is required' }, { status: 400 });
    }

    const saved = await SettingsService.set(key.trim(), String(value), {
      isSecret,
      category,
      description,
    });

    return NextResponse.json({
      success: true,
      message: `Setting "${key}" saved successfully`,
      setting: {
        ...saved,
        value: saved.isSecret ? '••••••••' : saved.value,
      },
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(error, 'Failed to save setting') },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await AuthService.getCurrentUser();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const key = searchParams.get('key');

    if (!key) {
      return NextResponse.json({ error: 'Key is required' }, { status: 400 });
    }

    const deleted = await SettingsService.delete(key);

    return NextResponse.json({
      success: true,
      message: `Setting "${key}" deleted`,
      deleted,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(error, 'Failed to delete setting') },
      { status: 500 }
    );
  }
}
