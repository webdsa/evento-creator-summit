'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';
import { LanguageSelector } from './LanguageSelector';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { SHOW_WORKSHOPS_PUBLIC } from '@/lib/env-public';

const PUBLIC_PATHS = ['/', '/inscricao', '/workshops', '/consulta'] as const;

function isPublicPath(pathname: string | null): boolean {
  if (!pathname) return false;
  if (PUBLIC_PATHS.includes(pathname as (typeof PUBLIC_PATHS)[number])) return true;
  if (pathname.startsWith('/workshops/')) return true;
  return false;
}

function isNavActive(pathname: string | null, href: string) {
  if (!pathname) return false;
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

function navLinkClassName({
  isActive,
  isCta,
  isPublic,
  mobileMenu,
}: {
  isActive: boolean;
  isCta: boolean;
  isPublic: boolean;
  mobileMenu?: boolean;
}) {
  const base = `min-h-[44px] flex items-center px-4 py-3 rounded-full text-sm font-medium transition-colors ${
    mobileMenu ? 'w-full' : 'whitespace-nowrap shrink-0'
  }`;

  if (mobileMenu) {
    if (isCta) {
      return `${base} bg-ov-purple text-white border-[3px] border-ov-ink font-extrabold hover:bg-ov-purple-bright ${
        isActive ? 'shadow-[2px_2px_0_#111] ring-2 ring-ov-purple-bright ring-offset-2' : 'shadow-[4px_4px_0_#111]'
      }`;
    }
    if (isActive) {
      return `${base} bg-violet-100 text-ov-purple font-extrabold border-[3px] border-ov-ink`;
    }
    return `${base} text-gray-900 hover:bg-gray-100`;
  }

  if (isPublic) {
    if (isCta) {
      return `${base} bg-white text-ov-purple border-[3px] border-ov-ink font-extrabold hover:bg-violet-50 ${
        isActive ? 'shadow-[2px_2px_0_#111] ring-2 ring-white/80 ring-offset-2 ring-offset-transparent' : 'shadow-[4px_4px_0_#111]'
      }`;
    }
    if (isActive) {
      return `${base} relative text-white font-extrabold after:absolute after:left-4 after:right-4 after:bottom-1.5 after:h-[3px] after:rounded-full after:bg-white`;
    }
    return `${base} text-white/70 hover:bg-white/10 hover:text-white`;
  }

  if (isCta) {
    return `${base} bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-md hover:from-blue-600 hover:to-cyan-600`;
  }
  if (isActive) {
    return `${base} bg-blue-100 text-blue-700 font-extrabold`;
  }
  return `${base} text-gray-600 hover:bg-gray-100 hover:text-gray-900`;
}

function NavLinks({
  navLinks,
  pathname,
  isPublic,
  onNavigate,
  mobileMenu,
}: {
  navLinks: { href: string; label: string }[];
  pathname: string | null;
  isPublic: boolean;
  onNavigate?: () => void;
  mobileMenu?: boolean;
}) {
  return (
    <>
      {navLinks.map(({ href, label }) => {
        const isActive = isNavActive(pathname, href);
        const isCta = href === '/inscricao';
        return (
          <Link
            key={href}
            href={href}
            className={navLinkClassName({ isActive, isCta, isPublic, mobileMenu })}
            aria-current={isActive ? 'page' : undefined}
            onClick={onNavigate}
          >
            {label}
          </Link>
        );
      })}
    </>
  );
}

export function Header() {
  const { t } = useLanguage();
  const pathname = usePathname();
  const isPublic = isPublicPath(pathname);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: '/inscricao', label: t.header.navInscription },
    { href: '/consulta', label: t.header.navCheckStatus },
    ...(SHOW_WORKSHOPS_PUBLIC
      ? [{ href: '/workshops', label: t.header.navWorkshops }]
      : []),
  ];

  return (
    <header
      className={
        isPublic
          ? 'sticky top-0 z-50 w-full header-public-bg min-w-0'
          : 'sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-lg shadow-sm min-w-0'
      }
    >
      <div className="w-full flex h-16 sm:h-20 items-center justify-between gap-2 sm:gap-6 px-3 sm:px-4 md:px-6 min-w-0">
        <div className="flex items-center shrink-0 min-w-0 mr-2 sm:mr-4 md:mr-8">
          <Link href="/" className="flex items-center min-w-0">
            <Image
              src={isPublic ? '/logo-creators-summit.png' : '/logo-midiatec.png'}
              alt="Creators Summit 2026"
              width={isPublic ? 280 : 160}
              height={isPublic ? 62 : 60}
              className="h-8 sm:h-10 md:h-12 w-auto object-contain object-left"
              priority
            />
          </Link>
        </div>

        {/* Desktop nav - oculto no mobile */}
        <nav className="hidden md:flex items-center gap-1 sm:gap-3 shrink-0">
          <NavLinks navLinks={navLinks} pathname={pathname} isPublic={isPublic} />
        </nav>

        {/* Mobile: menu hambúrguer */}
        <div className="flex md:hidden items-center gap-2 shrink-0 ml-auto">
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={
                  isPublic
                    ? 'text-white hover:bg-white/10 hover:text-white min-h-[44px] min-w-[44px]'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 min-h-[44px] min-w-[44px]'
                }
                aria-label="Abrir menu"
              >
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className={
                isPublic
                  ? 'bg-white border-l-[3px] border-ov-ink'
                  : 'bg-white border-gray-200'
              }
            >
              <SheetHeader>
                <SheetTitle className="text-gray-900 font-display italic uppercase">
                  Menu
                </SheetTitle>
              </SheetHeader>
              <div className="flex flex-col gap-2 mt-8">
                <NavLinks
                  navLinks={navLinks}
                  pathname={pathname}
                  isPublic={isPublic}
                  onNavigate={() => setMobileMenuOpen(false)}
                  mobileMenu
                />
              </div>
              <div className="mt-8 pt-6 border-t border-gray-200">
                <LanguageSelector theme={isPublic ? 'dark' : 'light'} />
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* Desktop: seletor de idioma */}
        <div className="ml-auto hidden md:flex items-center gap-1 sm:gap-2 shrink-0">
          <LanguageSelector theme={isPublic ? 'dark' : 'light'} />
        </div>
      </div>
    </header>
  );
}
