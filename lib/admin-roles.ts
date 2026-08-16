export type AdminRole = 'admin' | 'checkin' | 'secretaria';

export function parseAdminRole(value: unknown): AdminRole {
  if (value === 'checkin' || value === 'secretaria') return value;
  return 'admin';
}

export function parseStrictAdminRole(value: unknown): AdminRole | null {
  if (value === 'admin' || value === 'checkin' || value === 'secretaria') return value;
  return null;
}

export function staffHomePath(role: AdminRole | null | undefined): string {
  if (role === 'checkin') return '/admin/checkin';
  if (role === 'secretaria') return '/admin/registrations';
  return '/admin';
}

export function isSecretariaPathAllowed(pathname: string): boolean {
  return (
    pathname === '/admin/settings' ||
    pathname === '/admin/registrations' ||
    pathname.startsWith('/admin/registrations/')
  );
}
