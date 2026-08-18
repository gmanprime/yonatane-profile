import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/services/auth.service';
import { ContentService } from '@/lib/services/content.service';
import { createContentDatasetSchema } from '@/lib/validators/content.validator';

export async function GET() {
  try {
    const auth = await AuthService.getCurrentUser();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const datasets = await ContentService.getDatasets(auth.dbUser.id);
    return NextResponse.json({ datasets });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to retrieve datasets' },
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
    const parsed = createContentDatasetSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const dataset = await ContentService.createDataset(auth.dbUser.id, parsed.data);
    return NextResponse.json({ dataset }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to create dataset' },
      { status: 500 }
    );
  }
}
