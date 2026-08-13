import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { LanguageProvider } from '@/lib/i18n';
import { AuthProvider } from '@/lib/AuthProvider';
import { Toaster } from '@/components/ui/toaster';
import { DevAutoReload } from '@/components/DevAutoReload';
import { PublicBackgroundScroll } from '@/components/PublicBackgroundScroll';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Creators Summit 2026 - Inscrições',
  description: 'Sistema de inscrições para o evento Creators Summit 2026',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        <LanguageProvider>
          <AuthProvider>
            <PublicBackgroundScroll />
            {children}
            <Toaster />
            <DevAutoReload />
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
