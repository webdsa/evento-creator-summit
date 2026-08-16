import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { createAdminUser, getInstitution, listAdminDocuments, listInstitutions } from '@/lib/db';
import { getAdminAuth } from '@/lib/firebase-admin';
import { parseStrictAdminRole } from '@/lib/admin-roles';
import { sendStaffAccessEmail } from '@/lib/email';

function resolveAppOrigin(request: NextRequest): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  if (request.nextUrl?.origin) return request.nextUrl.origin.replace(/\/$/, '');
  const proto = request.headers.get('x-forwarded-proto');
  const host = request.headers.get('host');
  if (proto && host) return `${proto}://${host}`;
  return host ? `https://${host}` : '';
}

const AUTH_GET_USERS_BATCH_SIZE = 100;

/**
 * GET /api/admin/users
 * Returns all platform users (admins + checkin) with email from Firebase Auth. Admin only.
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    await requireAdmin(authHeader);
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const admins = await listAdminDocuments();
    const auth = getAdminAuth();
    const emailByUid: Record<string, string> = {};

    for (let i = 0; i < admins.length; i += AUTH_GET_USERS_BATCH_SIZE) {
      const batch = admins.slice(i, i + AUTH_GET_USERS_BATCH_SIZE);
      const result = await auth.getUsers(batch.map((a) => ({ uid: a.uid })));
      for (const u of result.users) {
        if (u.email) emailByUid[u.uid] = u.email;
      }
    }

    const institutions = await listInstitutions();
    const institutionNameById = new Map(institutions.map((i) => [i.id, i.name]));

    const users = admins.map((a) => ({
      uid: a.uid,
      email: emailByUid[a.uid] ?? '—',
      role: a.role,
      enabled: a.enabled,
      created_at: a.created_at,
      hasChangedPassword: a.hasChangedPassword,
      institution_id: a.institution_id ?? null,
      institution_name: a.institution_id ? institutionNameById.get(a.institution_id) ?? null : null,
    }));

    return NextResponse.json({ users });
  } catch (e) {
    console.error('List users error:', e);
    return NextResponse.json({ error: 'genericError' }, { status: 500 });
  }
}

/**
 * POST /api/admin/users
 * Body: { email: string, password: string, role: 'admin' | 'checkin' | 'secretaria', institution_id?: string }
 * Creates a Firebase Auth user and an admins document with the given role. Admin only.
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    await requireAdmin(authHeader);
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: { email?: string; password?: string; role?: string; institution_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  }

  const email = body.email?.trim();
  const password = body.password;
  const role = parseStrictAdminRole(body.role);
  const institutionId =
    typeof body.institution_id === 'string' ? body.institution_id.trim() : '';

  if (!role) {
    return NextResponse.json({ error: 'invalid_role' }, { status: 400 });
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'invalid_email' }, { status: 400 });
  }
  if (!password || typeof password !== 'string' || password.length < 8) {
    return NextResponse.json({ error: 'password_too_short' }, { status: 400 });
  }
  if (role === 'secretaria') {
    if (!institutionId) {
      return NextResponse.json({ error: 'institution_required' }, { status: 400 });
    }
    const institution = await getInstitution(institutionId);
    if (!institution) {
      return NextResponse.json({ error: 'institution_not_found' }, { status: 400 });
    }
  }

  try {
    const auth = getAdminAuth();
    const userRecord = await auth.createUser({
      email,
      password,
      emailVerified: false,
    });
    await createAdminUser({
      uid: userRecord.uid,
      role,
      institution_id: role === 'secretaria' ? institutionId : undefined,
    });
    const origin = resolveAppOrigin(request);
    const loginUrl = origin ? `${origin}/admin/login` : '/admin/login';
    const emailResult = await sendStaffAccessEmail({
      email,
      password,
      loginUrl,
    });
    if (!emailResult.sent) {
      console.error('Staff access email failed:', emailResult.error);
    }
    return NextResponse.json({
      ok: true,
      uid: userRecord.uid,
      email: userRecord.email,
      role,
      institution_id: role === 'secretaria' ? institutionId : null,
      emailSent: emailResult.sent,
    });
  } catch (err: unknown) {
    const code = err && typeof err === 'object' && 'code' in err ? (err as { code: string }).code : '';
    if (code === 'auth/email-already-exists') {
      return NextResponse.json({ error: 'email_already_exists' }, { status: 409 });
    }
    if (code === 'auth/invalid-password') {
      return NextResponse.json({ error: 'password_too_weak' }, { status: 400 });
    }
    console.error('Create user error:', err);
    return NextResponse.json({ error: 'genericError' }, { status: 500 });
  }
}
