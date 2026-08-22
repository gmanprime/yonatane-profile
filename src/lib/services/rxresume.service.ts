import { ImportService } from './import.service';
import { SettingsService } from './settings.service';

export interface RxResumeListItem {
  id: string;
  title: string;
  slug: string;
  isLocked?: boolean;
  isPublic?: boolean;
  createdAt?: string;
  updatedAt?: string;
  data?: Record<string, unknown>;
}

export interface RxResumeDownloadResult {
  buffer: Buffer;
  contentType: string;
  filename: string;
}

export class RxResumeService {
  private static async getDefaultBaseUrl(): Promise<string> {
    const dbUrl = await SettingsService.get('RXRESUME_BASE_URL', 'https://rxresu.me');
    return (dbUrl || 'https://rxresu.me').replace(/\/+$/, '');
  }

  private static async getDefaultApiKey(): Promise<string> {
    const dbKey = await SettingsService.get('RXRESUME_API_KEY', '');
    return dbKey || '';
  }

  /**
   * Lists all resumes in the user's RxResume account.
   * Calls GET /api/openapi/resumes with x-api-key header.
   */
  static async listResumes(apiKey?: string, baseUrl?: string): Promise<RxResumeListItem[]> {
    const defaultKey = await this.getDefaultApiKey();
    const defaultHost = await this.getDefaultBaseUrl();

    const key = (apiKey || defaultKey).trim();
    if (!key) {
      throw new Error('RxResume API Key is required. Please save RXRESUME_API_KEY in the Database Keystore or provide it in the request.');
    }

    const host = (baseUrl || defaultHost).replace(/\/+$/, '');
    const url = `${host}/api/openapi/resumes`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'x-api-key': key,
        'Accept': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      let errorDetail = '';
      try {
        const errorJson = await response.json();
        errorDetail = errorJson.message || errorJson.error || JSON.stringify(errorJson);
      } catch {
        errorDetail = await response.text();
      }
      throw new Error(`RxResume API error (${response.status}): ${errorDetail || response.statusText}`);
    }

    const json = await response.json();

    // RxResume returns an array or { data: [...] }
    let rawList: unknown[] = [];
    if (Array.isArray(json)) {
      rawList = json;
    } else if (json && typeof json === 'object' && Array.isArray((json as Record<string, unknown>).data)) {
      rawList = (json as Record<string, unknown>).data as unknown[];
    }

    return rawList.map((item: any) => ({
      id: item.id || item._id || '',
      title: item.title || item.name || 'Untitled Resume',
      slug: item.slug || '',
      isLocked: Boolean(item.isLocked),
      isPublic: Boolean(item.isPublic),
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      data: item.data,
    }));
  }

  /**
   * Fetches single resume JSON from RxResume OpenAPI.
   * Calls GET /api/openapi/resumes/{id} with x-api-key.
   */
  static async getResume(
    resumeId: string,
    apiKey?: string,
    baseUrl?: string
  ): Promise<Record<string, unknown>> {
    if (!resumeId) {
      throw new Error('Resume ID is required');
    }

    const defaultKey = await this.getDefaultApiKey();
    const defaultHost = await this.getDefaultBaseUrl();

    const key = (apiKey || defaultKey).trim();
    if (!key) {
      throw new Error('RxResume API Key is required. Please save RXRESUME_API_KEY in the Database Keystore or provide it in the request.');
    }

    const host = (baseUrl || defaultHost).replace(/\/+$/, '');
    const url = `${host}/api/openapi/resumes/${resumeId}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'x-api-key': key,
        'Accept': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      let errorDetail = '';
      try {
        const errorJson = await response.json();
        errorDetail = errorJson.message || errorJson.error || JSON.stringify(errorJson);
      } catch {
        errorDetail = await response.text();
      }
      throw new Error(`Failed to fetch resume from RxResume (${response.status}): ${errorDetail || response.statusText}`);
    }

    const json = await response.json();
    return json as Record<string, unknown>;
  }

  /**
   * Downloads the resume PDF buffer directly via RxResume endpoints.
   * Calls GET /api/openapi/resumes/{id}/pdf?target=resume with x-api-key header.
   */
  static async downloadResumePdf(
    resumeId: string,
    apiKey?: string,
    baseUrl?: string
  ): Promise<RxResumeDownloadResult> {
    if (!resumeId) {
      throw new Error('Resume ID is required for PDF download');
    }

    const defaultKey = await this.getDefaultApiKey();
    const defaultHost = await this.getDefaultBaseUrl();

    const key = (apiKey || defaultKey).trim();
    if (!key) {
      throw new Error('RxResume API Key is required for PDF download. Please save RXRESUME_API_KEY in the Database Keystore.');
    }

    const host = (baseUrl || defaultHost).replace(/\/+$/, '');

    const candidateUrls = [
      `${host}/api/openapi/resumes/${resumeId}/pdf?target=resume`,
      `${host}/api/openapi/resumes/${resumeId}/pdf`,
      `${host}/api/resume/print/${resumeId}`,
      `${host}/api/resume/pdf/${resumeId}`,
    ];

    let lastError: Error | null = null;

    for (const url of candidateUrls) {
      try {
        const headers: Record<string, string> = {
          'Accept': 'application/pdf, application/octet-stream, */*',
          'x-api-key': key,
        };

        const response = await fetch(url, {
          method: 'GET',
          headers,
          cache: 'no-store',
        });

        if (response.ok) {
          const contentType = response.headers.get('content-type') || 'application/pdf';
          const arrayBuffer = await response.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);

          return {
            buffer,
            contentType,
            filename: 'Yonatan_Elias_Resume.pdf',
          };
        } else {
          let errorText = '';
          try {
            const errJson = await response.json();
            errorText = errJson.message || errJson.error || JSON.stringify(errJson);
          } catch {
            errorText = await response.text();
          }
          lastError = new Error(`RxResume API error (${response.status} ${response.statusText}): ${errorText || 'Failed to download PDF'}`);
        }
      } catch (err: unknown) {
        lastError = err instanceof Error ? err : new Error(String(err));
      }
    }

    throw new Error(`Failed to download PDF from RxResume: ${lastError?.message || 'PDF endpoint returned an error'}`);
  }

  /**
   * Fetches a resume from RxResume and saves it into the database Content Datasets.
   */
  static async syncResumeToDataset(
    userId: string,
    resumeId: string,
    apiKey?: string,
    baseUrl?: string,
    customName?: string
  ) {
    const rawResume = await this.getResume(resumeId, apiKey, baseUrl);

    // If key provided, also persist in Settings Keystore
    if (apiKey && apiKey.trim()) {
      await SettingsService.set('RXRESUME_API_KEY', apiKey.trim(), {
        isSecret: true,
        category: 'integrations',
        description: 'RxResume API Key for REST & PDF exports',
      });
    }
    if (baseUrl && baseUrl.trim()) {
      await SettingsService.set('RXRESUME_BASE_URL', baseUrl.trim(), {
        isSecret: false,
        category: 'integrations',
        description: 'RxResume Host Base URL',
      });
    }

    // Extract nested resume data if wrapped in { data: ... }
    const resumeData = (rawResume.data && typeof rawResume.data === 'object' && !Array.isArray(rawResume.data))
      ? (rawResume.data as Record<string, unknown>)
      : rawResume;

    const title = customName || (rawResume.title as string) || (rawResume.name as string) || 'RxResume Cloud Sync';
    const defaultKey = await this.getDefaultApiKey();
    const defaultBase = await this.getDefaultBaseUrl();
    const effectiveKey = (apiKey || defaultKey).trim();
    const effectiveBase = (baseUrl || defaultBase).trim();

    // Augment rawJson with resume ID and source metadata for subsequent proxy downloads
    const fullDatasetPayload = {
      ...resumeData,
      _rxresumeMeta: {
        id: resumeId,
        slug: rawResume.slug,
        title: rawResume.title,
        apiKey: effectiveKey || undefined,
        baseUrl: effectiveBase !== 'https://rxresu.me' ? effectiveBase : undefined,
        syncedAt: new Date().toISOString(),
      },
    };

    return await ImportService.importResumeToDatabase(
      userId,
      title,
      fullDatasetPayload,
      'rxresume'
    );
  }
}
