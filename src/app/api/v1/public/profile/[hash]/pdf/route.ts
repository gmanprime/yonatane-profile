import { NextRequest, NextResponse } from 'next/server';
import { ProfileService } from '@/lib/services/profile.service';
import { RxResumeService } from '@/lib/services/rxresume.service';
import { SettingsService } from '@/lib/services/settings.service';
import { db } from '@/lib/db';
import { profiles } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getErrorMessage } from '@/lib/utils/error';

interface RouteContext {
  params: Promise<{ hash: string }>;
}

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const { hash } = await context.params;

    // 1. Resolve Profile
    const resolvedProfile = await ProfileService.getResolvedProfile(hash);
    if (!resolvedProfile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // 2. Extract dataset to find RxResume metadata if available
    let resumeId: string | null = null;
    let apiKey = (await SettingsService.get('RXRESUME_API_KEY')) || undefined;
    let baseUrl = (await SettingsService.get('RXRESUME_BASE_URL')) || undefined;

    const profileRecord = await db.query.profiles.findFirst({
      where: eq(profiles.id, resolvedProfile.profile.id),
      with: { contentDataset: true },
    });

    if (profileRecord?.contentDataset?.rawJson) {
      const rawJson = profileRecord.contentDataset.rawJson as Record<string, unknown>;
      const rxMeta = rawJson._rxresumeMeta as { id?: string; apiKey?: string; baseUrl?: string } | undefined;
      if (rxMeta?.id) {
        resumeId = rxMeta.id;
      } else if (typeof rawJson.id === 'string') {
        resumeId = rawJson.id;
      }
      if (!apiKey && rxMeta?.apiKey) {
        apiKey = rxMeta.apiKey;
      }
      if (!baseUrl && rxMeta?.baseUrl) {
        baseUrl = rxMeta.baseUrl;
      }
    }

    // Fallback: Check database keystore setting RXRESUME_DEFAULT_RESUME_ID
    if (!resumeId) {
      const defaultIdSetting = await SettingsService.get('RXRESUME_DEFAULT_RESUME_ID');
      if (defaultIdSetting) {
        resumeId = defaultIdSetting;
      }
    }

    // Fallback: If apiKey is present, list resumes and take the first one
    if (!resumeId && apiKey) {
      try {
        const resumes = await RxResumeService.listResumes(apiKey, baseUrl);
        if (resumes.length > 0) {
          resumeId = resumes[0].id;
        }
      } catch (listErr) {
        console.warn('Could not auto-discover resume ID from RxResume account:', listErr);
      }
    }

    if (!resumeId) {
      return NextResponse.json(
        {
          error: 'No RxResume ID associated with this profile dataset.',
          hint: 'Sync a resume from RxResume in the Admin Portal or configure RXRESUME_DEFAULT_RESUME_ID.',
        },
        { status: 404 }
      );
    }

    if (!apiKey) {
      return NextResponse.json(
        {
          error: 'RxResume API Key is required to download resume PDF.',
          hint: 'Please set RXRESUME_API_KEY in your .env.local file or re-sync this resume in the Admin Portal with your API key.',
        },
        { status: 401 }
      );
    }

    // 3. Download the PDF from RxResume OpenAPI endpoint
    const pdfResult = await RxResumeService.downloadResumePdf(resumeId, apiKey, baseUrl);

    // 4. Return PDF as attachment stream
    const candidateName = (resolvedProfile.basics.name as string) || 'Yonatan_Elias';
    const cleanFilename = `${candidateName.replace(/[^a-zA-Z0-9]/g, '_')}_Resume.pdf`;

    return new NextResponse(new Uint8Array(pdfResult.buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${cleanFilename}"`,
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    });
  } catch (error: unknown) {
    const message = getErrorMessage(error, 'Failed to proxy resume PDF');
    return NextResponse.json(
      { error: message },
      { status: 502 }
    );
  }
}
