/**
 * Firestore pode devolver datas como string ISO, Timestamp do Admin SDK ou, em JSON, `{ _seconds, _nanoseconds }`.
 * Converte para string ISO em UTC para uso na API e na UI.
 */
export function coerceFirestoreInstantToIso(value: unknown): string | null {
  if (value == null || value === '') return null;
  if (typeof value === 'string') {
    const ms = Date.parse(value);
    if (Number.isNaN(ms)) return null;
    return new Date(ms).toISOString();
  }
  if (value instanceof Date) {
    const ms = value.getTime();
    if (Number.isNaN(ms)) return null;
    return value.toISOString();
  }
  if (typeof value === 'object') {
    const o = value as Record<string, unknown>;
    if (typeof o.toDate === 'function') {
      try {
        const d = (o.toDate as () => Date)();
        if (d instanceof Date && !Number.isNaN(d.getTime())) return d.toISOString();
      } catch {
        /* ignore */
      }
    }
    const sec = o.seconds ?? o._seconds;
    if (typeof sec === 'number') {
      const nano =
        typeof o.nanoseconds === 'number'
          ? o.nanoseconds
          : typeof o._nanoseconds === 'number'
            ? o._nanoseconds
            : 0;
      return new Date(sec * 1000 + nano / 1e6).toISOString();
    }
  }
  return null;
}
