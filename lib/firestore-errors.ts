export class FirestoreQuotaError extends Error {
  constructor(message = 'quota_exceeded') {
    super(message);
    this.name = 'FirestoreQuotaError';
  }
}

export function isFirestoreQuotaError(error: unknown): boolean {
  if (error instanceof FirestoreQuotaError) return true;
  if (!error || typeof error !== 'object') return false;
  const code = 'code' in error ? Number((error as { code: unknown }).code) : NaN;
  const message = 'message' in error ? String((error as { message: unknown }).message) : '';
  return code === 8 || /resource_exhausted|quota exceeded/i.test(message);
}
