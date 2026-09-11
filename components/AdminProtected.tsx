'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/AuthProvider';
import { useLanguage } from '@/lib/i18n';
import { isSecretariaPathAllowed, staffHomePath } from '@/lib/admin-roles';
import { AdminNav } from './AdminNav';
import { Loader2 } from 'lucide-react';

export function AdminProtected({ children }: { children: React.ReactNode }) {
  const { user, loading, mustChangePassword, role, quotaExceeded } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/admin/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!loading && user && mustChangePassword === true && pathname !== '/admin/settings') {
      router.push('/admin/settings');
    }
  }, [user, loading, mustChangePassword, pathname, router]);

  useEffect(() => {
    if (!loading && user && mustChangePassword === false && role === 'checkin') {
      if (pathname !== '/admin/checkin' && pathname !== '/admin/settings') {
        router.replace(staffHomePath(role));
      }
    }
  }, [user, loading, mustChangePassword, role, pathname, router]);

  useEffect(() => {
    if (!loading && user && mustChangePassword === false && role === 'secretaria') {
      if (!isSecretariaPathAllowed(pathname)) {
        router.replace(staffHomePath(role));
      }
    }
  }, [user, loading, mustChangePassword, role, pathname, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (mustChangePassword === null || (mustChangePassword === false && role === null)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-4">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        {quotaExceeded ? (
          <p className="text-sm text-muted-foreground text-center max-w-md">{t.errors.quotaExceeded}</p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav />
      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
