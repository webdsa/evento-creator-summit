import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { createAdminUser, listAdminDocuments } from '@/lib/db';
import { getAdminAuth } from '@/lib/firebase-admin';
import type { AdminRole } from '@/lib/db';

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

    const users = admins.map((a) => ({
      uid: a.uid,
      email: emailByUid[a.uid] ?? '—',
      role: a.role,
      enabled: a.enabled,
      created_at: a.created_at,
      hasChangedPassword: a.hasChangedPassword,
    }));

    return NextResponse.json({ users });
  } catch (e) {
    console.error('List users error:', e);
    return NextResponse.json({ error: 'genericError' }, { status: 500 });
  }
}

/**
 * POST /api/admin/users
 * Body: { email: string, password: string, role: 'admin' | 'checkin' }
 * Creates a Firebase Auth user and an admins document with the given role. Admin only.
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    await requireAdmin(authHeader);
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: { email?: string; password?: string; role?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  }

  const email = body.email?.trim();
  const password = body.password;
  const role = body.role === 'checkin' ? 'checkin' : 'admin';

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'invalid_email' }, { status: 400 });
  }
  if (!password || typeof password !== 'string' || password.length < 8) {
    return NextResponse.json({ error: 'password_too_short' }, { status: 400 });
  }

  try {
    const auth = getAdminAuth();
    const userRecord = await auth.createUser({
      email,
      password,
      emailVerified: false,
    });
    await createAdminUser({ uid: userRecord.uid, role: role as AdminRole });
    return NextResponse.json({
      ok: true,
      uid: userRecord.uid,
      email: userRecord.email,
      role,
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
