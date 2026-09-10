import { formatBadgeName } from './badge-name';
import { normalizeLinkOrHandle } from './utils';

export type SpreadsheetRowInput = {
  rowNumber: number;
  influencer: string;
  arroba: string;
  nicho: string;
  uniao: string;
  email?: string;
  phone?: string;
};

export type MatchableRegistration = {
  id: string;
  full_name: string;
  cracha?: string;
  status: string;
};

export type InstitutionRef = {
  id: string;
  name: string;
};

export type PlannedSpreadsheetAction =
  | {
      kind: 'update';
      rowNumber: number;
      influencer: string;
      registrationId: string;
      fullName: string;
      score: number;
      cracha: string;
      arroba: string | null;
      conteudo: string;
      uniao: string;
      institutionId?: string;
      institutionName?: string;
      institutionStatus: 'matched' | 'unmatched' | 'empty';
    }
  | {
      kind: 'create';
      rowNumber: number;
      influencer: string;
      cracha: string;
      arroba: string | null;
      conteudo: string;
      uniao: string;
      email?: string;
      phone?: string;
      institutionId?: string;
      institutionName?: string;
      institutionStatus: 'matched' | 'unmatched' | 'empty';
    }
  | {
      kind: 'ambiguous';
      rowNumber: number;
      influencer: string;
      candidates: { id: string; full_name: string; score: number }[];
    }
  | {
      kind: 'skip';
      rowNumber: number;
      influencer: string;
      reason: string;
    };

const SKIP_TOKENS = new Set([
  'de',
  'da',
  'do',
  'das',
  'dos',
  'del',
  'la',
  'las',
  'los',
  'le',
  'van',
  'von',
  'y',
  'e',
  'di',
  'jr',
  'junior',
  'filho',
  'neto',
]);

export function normalizePersonName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function significantTokens(value: string): string[] {
  return normalizePersonName(value)
    .split(' ')
    .filter((t) => t.length > 1 && !SKIP_TOKENS.has(t));
}

export function scoreNameMatch(influencer: string, registration: MatchableRegistration): number {
  const inf = normalizePersonName(influencer);
  if (!inf) return 0;
  const full = normalizePersonName(registration.full_name ?? '');
  const cracha = normalizePersonName(registration.cracha ?? '');
  const badgeFromFull = normalizePersonName(formatBadgeName(registration.full_name ?? ''));
  const badgeFromInf = normalizePersonName(formatBadgeName(influencer));

  if (inf === full) return 100;
  if (cracha && inf === cracha) return 96;
  if (badgeFromFull && inf === badgeFromFull) return 94;
  if (cracha && badgeFromInf === cracha) return 92;

  const infTokens = significantTokens(influencer);
  const fullTokens = significantTokens(registration.full_name ?? '');
  if (infTokens.length === 0 || fullTokens.length === 0) return 0;
  if (infTokens.join(' ') === fullTokens.join(' ')) return 88;

  const first = infTokens[0];
  const last = infTokens[infTokens.length - 1];
  const firstInFull = fullTokens.includes(first);
  const lastInFull = fullTokens.includes(last);
  if (firstInFull && lastInFull) {
    const overlap = infTokens.filter((t) => fullTokens.includes(t)).length;
    return Math.min(86, 68 + overlap * 4);
  }
  if (infTokens.length >= 2 && fullTokens[0] === first && fullTokens[fullTokens.length - 1] === last) {
    return 80;
  }
  return 0;
}

const MATCH_THRESHOLD = 68;
const AMBIGUOUS_GAP = 8;

export function planSpreadsheetRow(
  row: SpreadsheetRowInput,
  registrations: MatchableRegistration[]
): PlannedSpreadsheetAction {
  const influencer = row.influencer.trim();
  if (!influencer) {
    return { kind: 'skip', rowNumber: row.rowNumber, influencer: '', reason: 'missing_influencer' };
  }

  const scored = registrations
    .map((reg) => ({ reg, score: scoreNameMatch(influencer, reg) }))
    .filter((item) => item.score >= MATCH_THRESHOLD)
    .sort((a, b) => b.score - a.score || (a.reg.status === 'confirmed' ? -1 : 1));

  const cracha = formatBadgeName(influencer);
  const arroba = normalizeSpreadsheetArroba(row.arroba);
  const conteudo = row.nicho.trim();
  const uniao = row.uniao.trim();

  if (scored.length === 0) {
    return {
      kind: 'create',
      rowNumber: row.rowNumber,
      influencer,
      cracha,
      arroba,
      conteudo,
      uniao,
      email: row.email?.trim() || undefined,
      phone: row.phone?.trim() || undefined,
      institutionStatus: 'empty',
    };
  }

  const best = scored[0];
  const second = scored[1];
  const confirmedBest = scored.filter((s) => s.reg.status === 'confirmed');
  const pool = confirmedBest.length > 0 ? confirmedBest : scored;
  const top = pool[0];
  const runnerUp = pool[1];

  if (runnerUp && top.score - runnerUp.score < AMBIGUOUS_GAP && top.reg.id !== runnerUp.reg.id) {
    return {
      kind: 'ambiguous',
      rowNumber: row.rowNumber,
      influencer,
      candidates: pool.slice(0, 4).map((s) => ({
        id: s.reg.id,
        full_name: s.reg.full_name,
        score: s.score,
      })),
    };
  }

  if (second && best.score === second.score && best.reg.id !== second.reg.id && confirmedBest.length !== 1) {
    return {
      kind: 'ambiguous',
      rowNumber: row.rowNumber,
      influencer,
      candidates: scored.slice(0, 4).map((s) => ({
        id: s.reg.id,
        full_name: s.reg.full_name,
        score: s.score,
      })),
    };
  }

  const chosen = pool[0];
  return {
    kind: 'update',
    rowNumber: row.rowNumber,
    influencer,
    registrationId: chosen.reg.id,
    fullName: chosen.reg.full_name,
    score: chosen.score,
    cracha,
    arroba,
    conteudo,
    uniao,
    institutionStatus: 'empty',
  };
}

export function resolveInstitutionFromUniao(
  uniao: string,
  institutions: InstitutionRef[]
): {
  institutionId?: string;
  institutionName?: string;
  institutionStatus: 'matched' | 'unmatched' | 'empty';
} {
  if (!uniao.trim()) return { institutionStatus: 'empty' };
  const inst = matchInstitutionByUniao(uniao, institutions);
  if (!inst) return { institutionStatus: 'unmatched' };
  return {
    institutionId: inst.id,
    institutionName: inst.name,
    institutionStatus: 'matched',
  };
}

export function planSpreadsheetSync(
  rows: SpreadsheetRowInput[],
  registrations: MatchableRegistration[],
  institutions: InstitutionRef[] = []
): PlannedSpreadsheetAction[] {
  return rows.map((row) => {
    const action = planSpreadsheetRow(row, registrations);
    if (action.kind !== 'update' && action.kind !== 'create') return action;
    return { ...action, ...resolveInstitutionFromUniao(action.uniao, institutions) };
  });
}

export function normalizeSpreadsheetArroba(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const normalized = normalizeLinkOrHandle(trimmed);
  return normalized || trimmed;
}

export function matchInstitutionByUniao(
  uniao: string,
  institutions: InstitutionRef[]
): InstitutionRef | null {
  const target = normalizePersonName(uniao.replace(/\b(uniao|union)\b/gi, ' '));
  if (!target) return null;
  let best: { inst: InstitutionRef; score: number } | null = null;
  for (const inst of institutions) {
    const name = normalizePersonName(inst.name.replace(/\b(uniao|union)\b/gi, ' '));
    if (!name) continue;
    let score = 0;
    if (name === target) score = 100;
    else if (name.includes(target) || target.includes(name)) score = 80;
    else {
      const a = new Set(target.split(' ').filter((t) => t.length > 2));
      const b = name.split(' ').filter((t) => t.length > 2);
      const overlap = b.filter((t) => a.has(t)).length;
      if (overlap >= 2 || (overlap === 1 && a.size === 1)) score = 60 + overlap * 10;
    }
    if (score >= 60 && (!best || score > best.score)) best = { inst, score };
  }
  return best?.inst ?? null;
}

const HEADER_ALIASES: Record<keyof Omit<SpreadsheetRowInput, 'rowNumber'>, string[]> = {
  influencer: ['influencer', 'influenciador'],
  arroba: ['arroba', 'link ou', 'link', 'handle', 'instagram'],
  nicho: ['nicho principal', 'nicho', 'conteudo', 'contenido'],
  uniao: ['uniao', 'union', 'instituicao', 'institucion'],
  email: ['email', 'e mail', 'correo'],
  phone: ['telefone', 'phone', 'whatsapp', 'celular'],
};

export function mapSpreadsheetObjectRow(
  raw: Record<string, unknown>,
  rowNumber: number
): SpreadsheetRowInput {
  const entries = Object.entries(raw).map(([key, value]) => [
    normalizePersonName(String(key)),
    value == null ? '' : String(value).trim(),
  ]);

  const pick = (field: keyof typeof HEADER_ALIASES): string => {
    const aliases = HEADER_ALIASES[field];
    for (const [header, value] of entries) {
      if (aliases.some((alias) => header === alias || header.startsWith(alias))) {
        return value;
      }
    }
    return '';
  };

  return {
    rowNumber,
    influencer: pick('influencer'),
    arroba: pick('arroba'),
    nicho: pick('nicho'),
    uniao: pick('uniao'),
    email: pick('email') || undefined,
    phone: pick('phone') || undefined,
  };
}
