import { NextRequest, NextResponse } from 'next/server';
import { requireEnabledStaff } from '@/lib/auth';
import { setAdminPasswordChanged } from '@/lib/db';

/**
 * POST /api/admin/password-changed
 * Marks that the admin has changed their password (at least once).
 * Call after successful client-side password change.
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const { uid } = await requireEnabledStaff(authHeader);
    await setAdminPasswordChanged(uid);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
}
