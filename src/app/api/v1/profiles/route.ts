import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/services/auth.service';
import { ProfileService } from '@/lib/services/profile.service';
import { createProfileSchema } from '@/lib/validators/profile.validator';
import { getErrorMessage } from '@/lib/utils/error';

export async function GET() {
  try {
    const auth = await AuthService.getCurrentUser();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const profileList = await ProfileService.getProfiles(auth.dbUser.id);
    return NextResponse.json({ profiles: profileList });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(error, 'Failed to retrieve profiles') },
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
    const parsed = createProfileSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const profile = await ProfileService.createProfile(auth.dbUser.id, parsed.data);
    return NextResponse.json({ profile }, { status: 201 });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(error, 'Failed to create profile') },
      { status: 500 }
    );
  }
}
