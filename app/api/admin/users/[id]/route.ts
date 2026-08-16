import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import {
  getAdmin,
  getInstitution,
  listAdminDocuments,
  updateAdminUser,
} from '@/lib/db';
import { getAdminAuth } from '@/lib/firebase-admin';
import { parseStrictAdminRole } from '@/lib/admin-roles';

function badId(id: unknown): boolean {
  return !id || typeof id !== 'string' || id.length > 1500;
}

/**
 * PATCH /api/admin/users/[id]
 * Body: { email?: string, password?: string, role?: AdminRole, institution_id?: string, enabled?: boolean }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let actorUid: string;
  try {
    const authHeader = request.headers.get('authorization');
    const admin = await requireAdmin(authHeader);
    actorUid = admin.uid;
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  if (badId(id)) {
    return NextResponse.json({ error: 'invalidRequest' }, { status: 400 });
  }

  const existing = await getAdmin(id);
  if (!existing) {
    return NextResponse.json({ error: 'notFound' }, { status: 404 });
  }

  let body: {
    email?: string;
    password?: string;
    role?: string;
    institution_id?: string | null;
    enabled?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  }

  const email = typeof body.email === 'string' ? body.email.trim() : undefined;
  const password = typeof body.password === 'string' ? body.password : undefined;
  const role = body.role !== undefined ? parseStrictAdminRole(body.role) : undefined;
  const enabled = typeof body.enabled === 'boolean' ? body.enabled : undefined;
  const institutionIdRaw =
    body.institution_id === null
      ? null
      : typeof body.institution_id === 'string'
        ? body.institution_id.trim()
        : undefined;

  if (body.role !== undefined && !role) {
    return NextResponse.json({ error: 'invalid_role' }, { status: 400 });
  }
  if (email !== undefined && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'invalid_email' }, { status: 400 });
  }
  if (password !== undefined && password.length > 0 && password.length < 8) {
    return NextResponse.json({ error: 'password_too_short' }, { status: 400 });
  }

  const nextRole = role ?? existing.role;
  const nextEnabled = enabled ?? existing.enabled;
  const nextInstitutionId =
    nextRole === 'secretaria'
      ? institutionIdRaw !== undefined
        ? institutionIdRaw
        : existing.institution_id ?? ''
      : null;

  if (nextRole === 'secretaria' && !nextInstitutionId) {
    return NextResponse.json({ error: 'institution_required' }, { status: 400 });
  }
  if (nextRole === 'secretaria' && nextInstitutionId) {
    const institution = await getInstitution(nextInstitutionId);
    if (!institution) {
      return NextResponse.json({ error: 'institution_not_found' }, { status: 400 });
    }
  }

  const isSelf = actorUid === id;
  if (isSelf && enabled === false) {
    return NextResponse.json({ error: 'cannot_disable_self' }, { status: 400 });
  }
  if (isSelf && role !== undefined && role !== 'admin') {
    return NextResponse.json({ error: 'cannot_change_own_role' }, { status: 400 });
  }

  const wouldLoseAdminAccess =
    existing.role === 'admin' &&
    existing.enabled &&
    (nextRole !== 'admin' || nextEnabled === false);
  if (wouldLoseAdminAccess) {
    const admins = await listAdminDocuments();
    const enabledAdmins = admins.filter((a) => a.enabled && a.role === 'admin' && a.uid !== id);
    if (enabledAdmins.length === 0) {
      return NextResponse.json({ error: 'cannot_remove_last_admin' }, { status: 400 });
    }
  }

  const firestoreUpdates: {
    role?: typeof nextRole;
    institution_id?: string | null;
    enabled?: boolean;
  } = {};
  if (role !== undefined) firestoreUpdates.role = role;
  if (enabled !== undefined) firestoreUpdates.enabled = enabled;
  if (nextRole === 'secretaria') {
    firestoreUpdates.institution_id = nextInstitutionId;
  } else if (existing.institution_id || role !== undefined) {
    firestoreUpdates.institution_id = null;
  }

  try {
    const auth = getAdminAuth();
    const authUpdates: { email?: string; password?: string } = {};
    if (email) authUpdates.email = email;
    if (password && password.length >= 8) authUpdates.password = password;
    if (Object.keys(authUpdates).length > 0) {
      await auth.updateUser(id, authUpdates);
    }
    if (Object.keys(firestoreUpdates).length > 0) {
      await updateAdminUser(id, firestoreUpdates);
    }
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const code = err && typeof err === 'object' && 'code' in err ? (err as { code: string }).code : '';
    if (code === 'auth/email-already-exists') {
      return NextResponse.json({ error: 'email_already_exists' }, { status: 409 });
    }
    if (code === 'auth/invalid-password') {
      return NextResponse.json({ error: 'password_too_weak' }, { status: 400 });
    }
    if (code === 'auth/user-not-found') {
      return NextResponse.json({ error: 'notFound' }, { status: 404 });
    }
    console.error('Update user error:', err);
    return NextResponse.json({ error: 'genericError' }, { status: 500 });
  }
}
