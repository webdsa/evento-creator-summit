'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useLanguage } from '@/lib/i18n';
import { SHOW_WORKSHOPS_PUBLIC } from '@/lib/env-public';

const FALLBACK_FOOTER = {
  footerInscription: 'Inscrição',
  footerCheckStatus: 'Consultar Inscrição',
  footerWorkshops: 'Workshops',
} as const;

export function PublicFooter() {
  const context = useLanguage();
  const t = context?.t;
  const landing = t?.landing;
  const footerInscription = landing?.footerInscription ?? FALLBACK_FOOTER.footerInscription;
  const footerCheckStatus = landing?.footerCheckStatus ?? FALLBACK_FOOTER.footerCheckStatus;
  const footerWorkshops = landing?.footerWorkshops ?? FALLBACK_FOOTER.footerWorkshops;

  return (
    <footer className="footer-public-bg px-3 sm:px-4 py-8 sm:py-10">
      <div className="container max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
        <Link href="/" className="shrink-0">
          <Image
            src="/logo-creators-summit.png"
            alt="Creators Summit 2026"
            width={280}
            height={62}
            className="h-10 w-auto sm:h-12 object-contain"
          />
        </Link>
        <nav className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
          <Link
            href="/inscricao"
            className="text-sm font-medium text-white/90 hover:text-white transition-colors"
          >
            {footerInscription}
          </Link>
          <Link
            href="/consulta"
            className="text-sm font-medium text-white/90 hover:text-white transition-colors"
          >
            {footerCheckStatus}
          </Link>
          {SHOW_WORKSHOPS_PUBLIC && (
            <Link
              href="/workshops"
              className="text-sm font-medium text-white/90 hover:text-white transition-colors"
            >
              {footerWorkshops}
            </Link>
          )}
        </nav>
        <div className="shrink-0 flex items-center gap-2 text-white/70 text-sm">
          <span>Igreja Adventista do Sétimo Dia</span>
          <Image
            src="/logo-iasd.png"
            alt="Igreja Adventista do Sétimo Dia"
            width={40}
            height={40}
            className="h-10 w-10 object-contain"
          />
        </div>
      </div>
    </footer>
  );
}
