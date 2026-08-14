import './globals.css';
import type { Metadata } from 'next';
import { Archivo_Black, Inter } from 'next/font/google';
import { LanguageProvider } from '@/lib/i18n';
import { AuthProvider } from '@/lib/AuthProvider';
import { Toaster } from '@/components/ui/toaster';
import { DevAutoReload } from '@/components/DevAutoReload';
import { PublicBackgroundScroll } from '@/components/PublicBackgroundScroll';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const archivoBlack = Archivo_Black({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-display',
});

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
      <body className={`${inter.className} ${inter.variable} ${archivoBlack.variable}`}>
        <LanguageProvider>
          <AuthProvider>
            <PublicBackgroundScroll />
            {children}
            <Toaster />
            <DevAutoReload />
            <Analytics />
            <SpeedInsights />
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
