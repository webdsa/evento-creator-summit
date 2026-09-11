import type { DecodedIdToken } from 'firebase-admin/auth';
import { parseStrictAdminRole, type AdminRole } from './admin-roles';
import { getAdminAuth } from './firebase-admin';

export type StaffProfile = {
  enabled: boolean;
  hasChangedPassword: boolean;
  role: AdminRole;
  institution_id?: string;
};

export function adminProfileFromClaims(claims: Record<string, unknown> | undefined | null): StaffProfile | null {
  if (!claims || claims.staff !== true) return null;
  const role = parseStrictAdminRole(claims.staffRole);
  if (!role) return null;
  const institutionId =
    typeof claims.staffInstitutionId === 'string' && claims.staffInstitutionId.trim()
      ? claims.staffInstitutionId.trim()
      : undefined;
  return {
    enabled: claims.staffEnabled !== false,
    hasChangedPassword: claims.mustChangePassword !== true,
    role,
    institution_id: institutionId,
  };
}

export function adminProfileFromDecodedToken(decoded: DecodedIdToken): StaffProfile | null {
  return adminProfileFromClaims(decoded as unknown as Record<string, unknown>);
}

export async function writeStaffClaims(uid: string, profile: StaffProfile | null): Promise<void> {
  if (!profile?.enabled) {
    await getAdminAuth().setCustomUserClaims(uid, { staff: false });
    return;
  }
  const claims: Record<string, unknown> = {
    staff: true,
    staffEnabled: true,
    staffRole: profile.role as AdminRole,
    mustChangePassword: !profile.hasChangedPassword,
  };
  if (profile.institution_id) claims.staffInstitutionId = profile.institution_id;
  await getAdminAuth().setCustomUserClaims(uid, claims);
}

export async function readStaffClaimsFromAuth(uid: string): Promise<StaffProfile | null> {
  const user = await getAdminAuth().getUser(uid);
  return adminProfileFromClaims((user.customClaims ?? {}) as Record<string, unknown>);
}
