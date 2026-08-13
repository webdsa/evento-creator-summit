import { NextRequest, NextResponse } from 'next/server';
import { requireCheckinOrAdmin } from '@/lib/auth';
import { getRegistrationByCodeForCheckin, setRegistrationCheckedIn } from '@/lib/db';

/**
 * POST /api/admin/checkin
 * Body: { code: "MT-000123" }
 * Marks registration as checked in (admin only).
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    await requireCheckinOrAdmin(authHeader);
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: { code?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  }

  const code = body.code?.trim()?.toUpperCase();
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
    if (reg.checked_in_at) {
      return NextResponse.json({
        ok: true,
        alreadyCheckedIn: true,
        checkedInAt: reg.checked_in_at,
      });
    }
    const checkedInAt = await setRegistrationCheckedIn(reg.id);
    return NextResponse.json({
      ok: true,
      alreadyCheckedIn: false,
      fullName: reg.full_name,
      checkedInAt,
    });
  } catch (e) {
    console.error('Check-in error:', e);
    return NextResponse.json({ error: 'genericError' }, { status: 500 });
  }
}
