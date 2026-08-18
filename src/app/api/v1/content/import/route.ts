import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/services/auth.service';
import { ImportService } from '@/lib/services/import.service';
import { importPayloadSchema } from '@/lib/validators/rxresume.validator';
import { getErrorMessage } from '@/lib/utils/error';

export async function POST(req: NextRequest) {
  try {
    const auth = await AuthService.getCurrentUser();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = importPayloadSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid import payload', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { name, data, type } = parsed.data;
    const dataset = await ImportService.importResumeToDatabase(
      auth.dbUser.id,
      name,
      data as Record<string, unknown>,
      type
    );

    return NextResponse.json({ success: true, dataset }, { status: 201 });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(error, 'Import failed') },
      { status: 500 }
    );
  }
}
