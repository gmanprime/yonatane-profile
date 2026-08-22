import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/services/auth.service';
import { RxResumeService } from '@/lib/services/rxresume.service';
import { ContentService } from '@/lib/services/content.service';
import { SettingsService } from '@/lib/services/settings.service';
import { getErrorMessage } from '@/lib/utils/error';

export async function GET(req: NextRequest) {
  try {
    const auth = await AuthService.getCurrentUser();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const customApiKey = searchParams.get('apiKey') || undefined;
    const customBaseUrl = searchParams.get('baseUrl') || undefined;

    const resumes = await RxResumeService.listResumes(customApiKey, customBaseUrl);
    const dbKey = await SettingsService.get('RXRESUME_API_KEY');

    return NextResponse.json({
      success: true,
      resumes,
      hasServerKey: !!dbKey,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(error, 'Failed to fetch resumes from RxResume') },
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
    const { resumeId, apiKey, baseUrl, datasetName, setAsPrimary } = body;

    if (!resumeId) {
      return NextResponse.json({ error: 'resumeId is required' }, { status: 400 });
    }

    const dataset = await RxResumeService.syncResumeToDataset(
      auth.dbUser.id,
      resumeId,
      apiKey,
      baseUrl,
      datasetName
    );

    if (setAsPrimary && dataset?.id) {
      await ContentService.setPrimaryDataset(dataset.id, auth.dbUser.id);
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Resume synced successfully from RxResume',
        dataset,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(error, 'Failed to sync resume from RxResume') },
      { status: 500 }
    );
  }
}
