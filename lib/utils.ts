import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const MAX_HANDLE_LENGTH = 100;
const MAX_HANDLE_URL_LENGTH = 300;
const HANDLE_PATTERN = /^@[A-Za-z0-9._]{2,50}$/;

/** Normaliza arroba (@usuario) ou URL de perfil. */
export function normalizeLinkOrHandle(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed.slice(0, MAX_HANDLE_URL_LENGTH);
  }
  const handle = trimmed.replace(/\s+/g, '').replace(/^@+/, '');
  if (!handle) return '';
  return `@${handle}`.slice(0, MAX_HANDLE_LENGTH);
}

export function isValidLinkOrHandle(value: string): boolean {
  const normalized = normalizeLinkOrHandle(value);
  if (!normalized) return false;
  if (/^https?:\/\//i.test(normalized)) return normalized.length >= 8;
  return HANDLE_PATTERN.test(normalized);
}
