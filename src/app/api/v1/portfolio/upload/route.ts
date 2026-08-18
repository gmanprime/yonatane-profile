import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/services/auth.service';
import { createAdminClient } from '@/lib/supabase/admin';
import { getErrorMessage } from '@/lib/utils/error';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
];

export async function POST(req: NextRequest) {
  try {
    const auth = await AuthService.getCurrentUser();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No image file provided' }, { status: 400 });
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `Unsupported file type (${file.type}). Allowed: JPG, PNG, WEBP, GIF, SVG` },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File size exceeds 5MB limit (${(file.size / (1024 * 1024)).toFixed(1)}MB)` },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileName = `${Date.now()}-${sanitizedName}`;
    const filePath = `${auth.dbUser.id}/${fileName}`;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const isRealSupabase = supabaseUrl && !supabaseUrl.includes('placeholder.supabase.co');

    if (isRealSupabase) {
      try {
        const supabase = createAdminClient();

        // Check or create bucket if needed
        const { error: uploadError } = await supabase.storage
          .from('portfolio')
          .upload(filePath, buffer, {
            contentType: file.type,
            upsert: true,
          });

        if (uploadError) {
          // If bucket not found, attempt to create it and retry
          if (uploadError.message?.toLowerCase().includes('bucket not found') || (uploadError as { statusCode?: string }).statusCode === '404') {
            await supabase.storage.createBucket('portfolio', { public: true });
            const { error: retryError } = await supabase.storage
              .from('portfolio')
              .upload(filePath, buffer, {
                contentType: file.type,
                upsert: true,
              });

            if (retryError) {
              throw retryError;
            }
          } else {
            throw uploadError;
          }
        }

        const { data: publicUrlData } = supabase.storage
          .from('portfolio')
          .getPublicUrl(filePath);

        return NextResponse.json({
          url: publicUrlData.publicUrl,
          fileName,
          size: file.size,
          type: file.type,
          storage: 'supabase',
        });
      } catch (storageErr) {
        console.warn('Supabase storage upload error, falling back to data URL:', storageErr);
        const base64Data = buffer.toString('base64');
        const dataUrl = `data:${file.type};base64,${base64Data}`;
        return NextResponse.json({
          url: dataUrl,
          fileName,
          size: file.size,
          type: file.type,
          storage: 'data-url-fallback',
        });
      }
    }

    // Local / Dev fallback when no Supabase project is connected
    const base64Data = buffer.toString('base64');
    const dataUrl = `data:${file.type};base64,${base64Data}`;

    return NextResponse.json({
      url: dataUrl,
      fileName,
      size: file.size,
      type: file.type,
      storage: 'data-url-fallback',
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(error, 'Failed to upload image') },
      { status: 500 }
    );
  }
}
