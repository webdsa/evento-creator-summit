'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useLanguage } from '@/lib/i18n';
import { SHOW_WORKSHOPS_PUBLIC } from '@/lib/env-public';
import { PixelSpeechSmile } from '@/components/brand/PixelIcons';

const FALLBACK_FOOTER = {
  footerInscription: 'Inscrição',
  footerCheckStatus: 'Consultar Inscrição',
  footerWorkshops: 'Workshops',
  footerChurchName: 'Igreja Adventista do Sétimo Dia',
} as const;

export function PublicFooter() {
  const context = useLanguage();
  const t = context?.t;
  const landing = t?.landing;
  const footerInscription = landing?.footerInscription ?? FALLBACK_FOOTER.footerInscription;
  const footerCheckStatus = landing?.footerCheckStatus ?? FALLBACK_FOOTER.footerCheckStatus;
  const footerWorkshops = landing?.footerWorkshops ?? FALLBACK_FOOTER.footerWorkshops;
  const footerChurchName = landing?.footerChurchName ?? FALLBACK_FOOTER.footerChurchName;

  return (
    <footer className="footer-public-bg px-3 sm:px-4 py-8 sm:py-10">
      <div className="container max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
        <Link href="/" className="shrink-0 flex items-center gap-3">
          <PixelSpeechSmile className="w-10 h-10 text-white" />
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
            className="text-sm font-extrabold uppercase tracking-wide text-white/90 hover:text-white transition-colors"
          >
            {footerInscription}
          </Link>
          <Link
            href="/consulta"
            className="text-sm font-extrabold uppercase tracking-wide text-white/90 hover:text-white transition-colors"
          >
            {footerCheckStatus}
          </Link>
          {SHOW_WORKSHOPS_PUBLIC && (
            <Link
              href="/workshops"
              className="text-sm font-extrabold uppercase tracking-wide text-white/90 hover:text-white transition-colors"
            >
              {footerWorkshops}
            </Link>
          )}
        </nav>
        <div className="shrink-0 flex items-center gap-2 text-white/70 text-sm">
          <span>{footerChurchName}</span>
          <Image
            src="/logo-iasd.png"
            alt={footerChurchName}
            width={40}
            height={40}
            className="h-10 w-10 object-contain"
          />
        </div>
      </div>
    </footer>
  );
}
