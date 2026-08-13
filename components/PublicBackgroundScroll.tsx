'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

const PUBLIC_PATHS = ['/', '/inscricao', '/workshops', '/consulta'];

function isPublicPath(pathname: string | null): boolean {
  if (!pathname) return false;
  if (PUBLIC_PATHS.some((p) => pathname === p)) return true;
  if (pathname.startsWith('/workshops/')) return true;
  return false;
}

/** Suavização: quanto menor, mais fluido (e mais atraso). */
const LERP = 0.06;
/** Escala do scroll para o argumento do seno (radianos por pixel) – controla a “velocidade” da morph. */
const SCROLL_SCALE = 0.004;
const MAX_TRANSLATE_Y = 120;
const TRANSLATE_FACTOR = 0.12;

/** Oscila suavemente entre 0 e 1 sem saltos (usa seno). */
function smoothPhase(scrollY: number, speed: number, phase = 0): number {
  return (Math.sin(scrollY * SCROLL_SCALE * speed + phase) + 1) / 2;
}

export function PublicBackgroundScroll() {
  const pathname = usePathname();
  const isPublic = isPublicPath(pathname);

  useEffect(() => {
    if (!isPublic) return;

    let rafId: number;
    let scrollYSmoothed = 0;
    let morph1 = 0,
      morph2 = 0,
      morph3 = 0,
      morph4 = 0;
    let translateYCurrent = 0;

    const update = () => {
      const scrollY = window.scrollY;
      scrollYSmoothed += (scrollY - scrollYSmoothed) * LERP;

      const t1 = smoothPhase(scrollYSmoothed, 1, 0);
      const t2 = smoothPhase(scrollYSmoothed, 1.3, 1.5);
      const t3 = smoothPhase(scrollYSmoothed, 0.8, 3);
      const t4 = smoothPhase(scrollYSmoothed, 1.1, 4.2);

      morph1 += (t1 - morph1) * LERP;
      morph2 += (t2 - morph2) * LERP;
      morph3 += (t3 - morph3) * LERP;
      morph4 += (t4 - morph4) * LERP;

      const translateYTarget = Math.min(scrollY * TRANSLATE_FACTOR, MAX_TRANSLATE_Y);
      translateYCurrent += (translateYTarget - translateYCurrent) * LERP;

      document.body.style.setProperty('--public-scroll-y', String(translateYCurrent));
      document.body.style.setProperty('--morph-1', String(morph1));
      document.body.style.setProperty('--morph-2', String(morph2));
      document.body.style.setProperty('--morph-3', String(morph3));
      document.body.style.setProperty('--morph-4', String(morph4));
      rafId = requestAnimationFrame(update);
    };

    rafId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(rafId);
  }, [isPublic]);

  return null;
}
