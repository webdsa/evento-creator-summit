import { getAdminAuth } from './firebase-admin';
import { isAdminUser, canDoCheckin, getAdmin } from './db';
import type { AdminRole } from './admin-roles';

export type StaffAccess = {
  uid: string;
  role: AdminRole;
  institutionId: string | null;
};

/**
 * Get current user from Firebase ID token (Bearer token in Authorization header).
 * Use in API routes: pass the request and read Authorization header.
 */
export async function getCurrentUser(
  authorizationHeader: string | null
): Promise<{ uid: string; email?: string } | null> {
  const token =
    authorizationHeader?.startsWith('Bearer ') ? authorizationHeader.slice(7) : null;
  if (!token) return null;

  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    return { uid: decoded.uid, email: decoded.email };
  } catch {
    return null;
  }
}

export async function isAdmin(authorizationHeader: string | null): Promise<boolean> {
  const user = await getCurrentUser(authorizationHeader);
  if (!user) return false;
  return isAdminUser(user.uid);
}

/** Exige usuário autenticado com role admin (acesso total ao painel). */
export async function requireAdmin(authorizationHeader: string | null): Promise<{ uid: string }> {
  const user = await getCurrentUser(authorizationHeader);
  if (!user) {
    throw new Error('Unauthorized');
  }
  const ok = await isAdminUser(user.uid);
  if (!ok) {
    throw new Error('Unauthorized');
  }
  return { uid: user.uid };
}

/** Qualquer usuário habilitado em `admins` (perfil admin ou check-in), alinhado a GET /api/admin/me. */
export async function requireEnabledStaff(
  authorizationHeader: string | null
): Promise<{ uid: string }> {
  const user = await getCurrentUser(authorizationHeader);
  if (!user) {
    throw new Error('Unauthorized');
  }
  const admin = await getAdmin(user.uid);
  if (!admin?.enabled) {
    throw new Error('Unauthorized');
  }
  return { uid: user.uid };
}

/** Exige usuário autenticado com role admin ou checkin (acesso à página/API de check-in). */
export async function requireCheckinOrAdmin(
  authorizationHeader: string | null
): Promise<{ uid: string }> {
  const user = await getCurrentUser(authorizationHeader);
  if (!user) {
    throw new Error('Unauthorized');
  }
  const ok = await canDoCheckin(user.uid);
  if (!ok) {
    throw new Error('Unauthorized');
  }
  return { uid: user.uid };
}

/** Admin (todas as instituições) ou secretaria (apenas a instituição vinculada). */
export async function requireRegistrationsAccess(
  authorizationHeader: string | null
): Promise<StaffAccess> {
  const user = await getCurrentUser(authorizationHeader);
  if (!user) {
    throw new Error('Unauthorized');
  }
  const admin = await getAdmin(user.uid);
  if (!admin?.enabled) {
    throw new Error('Unauthorized');
  }
  if (admin.role === 'admin') {
    return { uid: user.uid, role: 'admin', institutionId: null };
  }
  if (admin.role === 'secretaria' && admin.institution_id) {
    return { uid: user.uid, role: 'secretaria', institutionId: admin.institution_id };
  }
  throw new Error('Unauthorized');
}

export function canAccessRegistration(
  staff: StaffAccess,
  institutionId: string | undefined | null
): boolean {
  if (staff.role === 'admin') return true;
  return Boolean(staff.institutionId && institutionId && staff.institutionId === institutionId);
}
