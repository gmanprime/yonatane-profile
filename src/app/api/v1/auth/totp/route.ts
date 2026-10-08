import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/services/auth.service';
import { totpSetupSchema } from '@/lib/validators/auth.validator';
import { db } from '@/lib/db';
import { appSettings } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getErrorMessage } from '@/lib/utils/error';

export async function POST() {
  try {
    const currentUser = await AuthService.getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { secret, uri } = await AuthService.generateTotpSecret();

    return NextResponse.json({
      success: true,
      secret,
      uri,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(error, 'Failed to generate TOTP secret') },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const currentUser = await AuthService.getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = totpSetupSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid TOTP code format', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const isValid = await AuthService.verifyTotpCode(parsed.data.totpCode);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid verification code. Please check your authenticator app.' },
        { status: 400 }
      );
    }

    await AuthService.logSecurityEvent(
      currentUser.dbUser.id,
      'totp_enrolled',
      req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
      req.headers.get('user-agent'),
      { method: 'master_totp_setup' }
    );

    return NextResponse.json({
      success: true,
      verified: true,
      message: 'Master TOTP secret verified and enabled successfully.',
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(error, 'Failed to verify TOTP setup') },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const currentUser = await AuthService.getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [setting] = await db
      .select()
      .from(appSettings)
      .where(eq(appSettings.key, 'MASTER_TOTP_SECRET'))
      .limit(1);

    return NextResponse.json({
      success: true,
      enrolled: Boolean(setting?.value),
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(error, 'Failed to check TOTP status') },
      { status: 500 }
    );
  }
}
