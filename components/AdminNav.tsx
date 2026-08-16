'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLanguage } from '@/lib/i18n';
import { useAuth } from '@/lib/AuthProvider';
import { LanguageSelector } from './LanguageSelector';
import { Button } from './ui/button';
import { LayoutDashboard, Building2, Presentation, Ticket, Users, Mic, Wrench, Settings, LogOut, QrCode, UserPlus } from 'lucide-react';

export function AdminNav() {
  const pathname = usePathname();
  const { t } = useLanguage();
  const { signOut, role } = useAuth();

  const isCheckinOnly = role === 'checkin';
  const isSecretaria = role === 'secretaria';
  const homeHref = isCheckinOnly ? '/admin/checkin' : isSecretaria ? '/admin/registrations' : '/admin';

  const navItemsLeftFull = [
    { href: '/admin', label: t.admin.nav.dashboard, icon: LayoutDashboard },
    { href: '/admin/institutions', label: t.admin.nav.institutions, icon: Building2 },
    { href: '/admin/vouchers', label: t.admin.nav.vouchers, icon: Ticket },
    { href: '/admin/registrations', label: t.admin.nav.registrations, icon: Users },
    { href: '/admin/checkin', label: t.admin.nav.checkin, icon: QrCode },
    { href: '/admin/users', label: t.admin.nav.users, icon: UserPlus },
  ];

  const navItemsRightFull = [
    { href: '/admin/rooms', label: t.admin.nav.rooms, icon: Presentation },
    { href: '/admin/speakers', label: t.admin.nav.speakers, icon: Mic },
    { href: '/admin/workshops', label: t.admin.nav.workshopsAndPlenarias, icon: Wrench },
  ];

  const navItemsLeft = isCheckinOnly
    ? [{ href: '/admin/checkin', label: t.admin.nav.checkin, icon: QrCode }]
    : isSecretaria
      ? [{ href: '/admin/registrations', label: t.admin.nav.registrations, icon: Users }]
      : navItemsLeftFull;

  const navItemsRight = isCheckinOnly || isSecretaria ? [] : navItemsRightFull;

  const renderNavButton = (item: (typeof navItemsLeft)[0]) => {
    const Icon = item.icon;
    const isActive = pathname === item.href;
    return (
      <Link key={item.href} href={item.href}>
        <Button
          variant={isActive ? 'default' : 'ghost'}
          size="sm"
          className="gap-2"
        >
          <Icon className="h-4 w-4" />
          {item.label}
        </Button>
      </Link>
    );
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white">
      <div className="w-full flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href={homeHref} className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight">
              {t.common.appName}
            </h1>
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            {navItemsLeft.map(renderNavButton)}
            {navItemsRight.length > 0 && (
              <>
                <div className="mx-6 h-8 w-px shrink-0 bg-border" aria-hidden />
                {navItemsRight.map(renderNavButton)}
              </>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <LanguageSelector />
          <Link href="/admin/settings">
            <Button
              variant={pathname === '/admin/settings' ? 'default' : 'ghost'}
              size="sm"
              className="gap-2"
            >
              <Settings className="h-4 w-4" />
              {t.admin.nav.settings}
            </Button>
          </Link>
          <Button variant="ghost" size="sm" onClick={() => signOut()} className="gap-2">
            <LogOut className="h-4 w-4" />
            {t.admin.nav.logout}
          </Button>
        </div>
      </div>
    </header>
  );
}
