'use client';

import type { InstitutionGroup } from '@/lib/db';

/** Classes do destaque de grupo (também exportado para compatibilidade com imports antigos). */
export function institutionGroupBannerClassNames(group: InstitutionGroup): {
  box: string;
  label: string;
  value: string;
  tag: string;
} {
  switch (group) {
    case 1:
      return {
        box: 'rounded-xl border-2 border-red-400 bg-gradient-to-br from-red-100 via-rose-50 to-red-50 px-4 py-4 sm:py-5 text-center shadow-md ring-1 ring-red-200/80',
        label: 'text-xs font-semibold uppercase tracking-wider text-red-900/80 mb-1',
        value: 'text-xl sm:text-2xl font-bold text-red-950 tracking-tight',
        tag: 'mt-2 inline-flex items-center justify-center rounded-full border border-red-900/25 bg-red-600 px-4 py-1.5 text-sm font-semibold text-white shadow-sm',
      };
    case 2:
      return {
        box: 'rounded-xl border-2 border-green-400 bg-gradient-to-br from-green-100 via-emerald-50 to-green-50 px-4 py-4 sm:py-5 text-center shadow-md ring-1 ring-green-200/80',
        label: 'text-xs font-semibold uppercase tracking-wider text-green-900/80 mb-1',
        value: 'text-xl sm:text-2xl font-bold text-green-950 tracking-tight',
        tag: 'mt-2 inline-flex items-center justify-center rounded-full border border-green-800/25 bg-green-600 px-4 py-1.5 text-sm font-semibold text-white shadow-sm',
      };
    case 3:
      return {
        box: 'rounded-xl border-2 border-blue-400 bg-gradient-to-br from-blue-100 via-sky-50 to-blue-50 px-4 py-4 sm:py-5 text-center shadow-md ring-1 ring-blue-200/80',
        label: 'text-xs font-semibold uppercase tracking-wider text-blue-900/80 mb-1',
        value: 'text-xl sm:text-2xl font-bold text-blue-950 tracking-tight',
        tag: 'mt-2 inline-flex items-center justify-center rounded-full border border-blue-800/25 bg-blue-600 px-4 py-1.5 text-sm font-semibold text-white shadow-sm',
      };
  }
}

export function InstitutionGroupBanner(props: {
  group: InstitutionGroup;
  groupLabel: string;
  groupTitle: string;
  /** Nome da cor do grupo (ex.: Vermelho, Verde, Azul), já traduzido. */
  colorName: string;
}) {
  const gn = institutionGroupBannerClassNames(props.group);
  return (
    <div className={gn.box}>
      <p className={gn.label}>{props.groupLabel}</p>
      <p className={gn.value}>{props.groupTitle}</p>
      <span className={gn.tag}>{props.colorName}</span>
    </div>
  );
}
