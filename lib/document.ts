import { type CountryId, isValidCountryId } from '@/lib/countries';

export type DocumentType = 'cpf' | 'dni' | 'cedula' | 'passport';

export const DOCUMENT_TYPES: DocumentType[] = ['cpf', 'dni', 'cedula', 'passport'];

export const DOCUMENT_TYPES_BY_COUNTRY: Record<CountryId, DocumentType[]> = {
  BR: ['cpf'],
  AR: ['dni', 'passport'],
  PE: ['dni', 'passport'],
  UY: ['cedula', 'passport'],
  PY: ['cedula', 'passport'],
  CL: ['cedula', 'passport'],
  BO: ['cedula', 'passport'],
  EC: ['cedula', 'passport'],
};

export function isValidDocumentType(value: string | undefined | null): value is DocumentType {
  return typeof value === 'string' && (DOCUMENT_TYPES as string[]).includes(value);
}

export function getDocumentTypesForCountry(country: CountryId): DocumentType[] {
  return DOCUMENT_TYPES_BY_COUNTRY[country];
}

export function isDocumentTypeAllowed(country: CountryId, type: DocumentType): boolean {
  return DOCUMENT_TYPES_BY_COUNTRY[country].includes(type);
}

function onlyDigits(value: string): string {
  return value.replace(/\D/g, '');
}

function onlyAlphanumeric(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function sanitizeDocumentNumber(
  country: CountryId,
  type: DocumentType,
  raw: string
): string {
  const value = String(raw ?? '');
  if (type === 'passport') return onlyAlphanumeric(value).slice(0, 12);
  if (type === 'cpf') return onlyDigits(value).slice(0, 11);
  if (type === 'dni') {
    return onlyDigits(value).slice(0, country === 'PE' ? 9 : 8);
  }
  if (country === 'CL') return onlyAlphanumeric(value).replace(/[^0-9K]/g, '').slice(0, 9);
  if (country === 'BO') return onlyAlphanumeric(value).slice(0, 10);
  if (country === 'EC') return onlyDigits(value).slice(0, 10);
  return onlyDigits(value).slice(0, 8);
}

function isRepeatingDigits(value: string): boolean {
  return /^(\d)\1+$/.test(value);
}

function isValidCpf(value: string): boolean {
  if (!/^\d{11}$/.test(value) || isRepeatingDigits(value)) return false;
  const calc = (base: string, factor: number) => {
    let sum = 0;
    for (const char of base) {
      sum += Number(char) * factor;
      factor -= 1;
    }
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };
  const d1 = calc(value.slice(0, 9), 10);
  const d2 = calc(value.slice(0, 10), 11);
  return d1 === Number(value[9]) && d2 === Number(value[10]);
}

function isValidEcuadorCedula(value: string): boolean {
  if (!/^\d{10}$/.test(value)) return false;
  const province = Number(value.slice(0, 2));
  if ((province < 1 || province > 24) && province !== 30) return false;
  if (Number(value[2]) >= 6) return false;
  const coef = [2, 1, 2, 1, 2, 1, 2, 1, 2];
  let sum = 0;
  for (let i = 0; i < 9; i += 1) {
    let prod = Number(value[i]) * coef[i];
    if (prod >= 10) prod -= 9;
    sum += prod;
  }
  const check = sum % 10 === 0 ? 0 : 10 - (sum % 10);
  return check === Number(value[9]);
}

function isValidChileRut(value: string): boolean {
  if (!/^\d{7,8}[0-9K]$/.test(value)) return false;
  const body = value.slice(0, -1);
  const expected = value.slice(-1);
  let sum = 0;
  let factor = 2;
  for (let i = body.length - 1; i >= 0; i -= 1) {
    sum += Number(body[i]) * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }
  const rest = 11 - (sum % 11);
  const digit = rest === 11 ? '0' : rest === 10 ? 'K' : String(rest);
  return digit === expected;
}

export function validateDocument(
  country: string,
  type: string,
  raw: string
): { ok: true; country: CountryId; type: DocumentType; value: string } | { ok: false } {
  if (!isValidCountryId(country) || !isValidDocumentType(type)) return { ok: false };
  if (!isDocumentTypeAllowed(country, type)) return { ok: false };

  const value = sanitizeDocumentNumber(country, type, raw);
  if (!value) return { ok: false };

  if (type === 'cpf') {
    return isValidCpf(value) ? { ok: true, country, type, value } : { ok: false };
  }

  if (type === 'passport') {
    return /^[A-Z0-9]{6,12}$/.test(value) ? { ok: true, country, type, value } : { ok: false };
  }

  if (type === 'dni') {
    const valid = country === 'PE' ? /^\d{8,9}$/.test(value) : /^\d{7,8}$/.test(value);
    return valid ? { ok: true, country, type, value } : { ok: false };
  }

  if (country === 'EC') {
    return isValidEcuadorCedula(value) ? { ok: true, country, type, value } : { ok: false };
  }
  if (country === 'CL') {
    return isValidChileRut(value) ? { ok: true, country, type, value } : { ok: false };
  }
  if (country === 'BO') {
    return /^[A-Z0-9]{5,10}$/.test(value) ? { ok: true, country, type, value } : { ok: false };
  }
  return /^\d{6,8}$/.test(value) ? { ok: true, country, type, value } : { ok: false };
}

export function getDocumentHintKey(
  type: DocumentType | ''
): 'documentoHintCpf' | 'documentoHintDni' | 'documentoHintCedula' | 'documentoHintPassport' | 'documentoHint' {
  if (type === 'cpf') return 'documentoHintCpf';
  if (type === 'dni') return 'documentoHintDni';
  if (type === 'cedula') return 'documentoHintCedula';
  if (type === 'passport') return 'documentoHintPassport';
  return 'documentoHint';
}
