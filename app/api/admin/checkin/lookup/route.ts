import { NextRequest, NextResponse } from 'next/server';
import { requireCheckinOrAdmin } from '@/lib/auth';
import { getRegistrationByCodeForCheckin } from '@/lib/db';

/**
 * GET /api/admin/checkin/lookup?code=MT-000123
 * Returns registration summary for check-in (admin only).
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    await requireCheckinOrAdmin(authHeader);
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const code = request.nextUrl.searchParams.get('code')?.trim()?.toUpperCase();
  if (!code) {
    return NextResponse.json({ error: 'code required' }, { status: 400 });
  }

  try {
    const reg = await getRegistrationByCodeForCheckin(code);
    if (!reg) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    if (reg.status !== 'confirmed') {
      return NextResponse.json({ error: 'registration_canceled' }, { status: 400 });
    }
    return NextResponse.json({
      id: reg.id,
      registrationCode: reg.registration_code,
      fullName: reg.full_name,
      checkedInAt: reg.checked_in_at,
    });
  } catch (e) {
    console.error('Check-in lookup error:', e);
    return NextResponse.json({ error: 'genericError' }, { status: 500 });
  }
}
