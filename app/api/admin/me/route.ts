import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, resolveAdminProfile } from '@/lib/auth';
import { isFirestoreQuotaError } from '@/lib/firestore-errors';

/**
 * GET /api/admin/me
 * Verifies Firebase ID token and checks if user is admin.
 * Returns 200 with { ok, mustChangePassword } if admin, 401/403 otherwise.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const user = await getCurrentUser(authHeader);
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const admin = await resolveAdminProfile(user);
    if (!admin?.enabled) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }
    return NextResponse.json({
      ok: true,
      mustChangePassword: !admin.hasChangedPassword,
      role: admin.role,
      institution_id: admin.institution_id ?? null,
    });
  } catch (error) {
    if (isFirestoreQuotaError(error)) {
      return NextResponse.json({ error: 'quota_exceeded' }, { status: 503 });
    }
    console.error('GET /api/admin/me error:', error);
    return NextResponse.json({ error: 'genericError' }, { status: 500 });
  }
}
