import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { AuthService } from '@/lib/services/auth.service';

export async function GET(req: NextRequest) {
  const { searchParams, origin } = req.nextUrl;
  const code = searchParams.get('code');
  const next = searchParams.get('next') || '/admin';

  if (code) {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error && data.user) {
        await AuthService.syncUser(data.user);
        return NextResponse.redirect(`${origin}${next}`);
      }
    } catch {
      // Ignore and redirect to login on failure
    }
  }

  return NextResponse.redirect(`${origin}/admin/login?error=auth_callback_failed`);
}
