'use client';

import { AuthProvider } from '@/lib/AuthProvider';
import { LanguageProvider } from '@/lib/i18n';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <LanguageProvider>
      <AuthProvider>{children}</AuthProvider>
    </LanguageProvider>
  );
}
