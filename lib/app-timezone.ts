import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';

/** Fuso usado na aplicação (horário de Brasília). */
export const APP_TIME_ZONE = 'America/Sao_Paulo';

const NAIVE_LOCAL_DATETIME =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?(?:\.\d{1,3})?$/;

/** Formata um instante (ISO UTC, `Date` ou timestamp) no relógio de São Paulo. */
export function formatInAppTz(date: Date | string | number, pattern: string): string {
  return formatInTimeZone(date, APP_TIME_ZONE, pattern);
}

/** ISO UTC → valor para `<input type="datetime-local">` (componentes em SP). */
export function utcIsoToDatetimeLocalForApp(iso: string): string {
  return formatInTimeZone(iso, APP_TIME_ZONE, "yyyy-MM-dd'T'HH:mm");
}

/** Valor de datetime-local interpretado como horário de São Paulo → ISO UTC. */
export function datetimeLocalAppToUtcIso(local: string): string {
  const s = local.trim();
  const d = fromZonedTime(s, APP_TIME_ZONE);
  if (Number.isNaN(d.getTime())) {
    throw new RangeError('invalid datetime');
  }
  return d.toISOString();
}

/**
 * Para expiração de voucher: aceita ISO com Z/offset ou string sem fuso (tipo datetime-local),
 * neste caso interpretada em {@link APP_TIME_ZONE}.
 */
export function parseExpiresAtInputToUtcIso(input: string): string | null {
  const s = input.trim();
  if (!s) return null;
  const hasExplicitTz =
    /Z$/i.test(s) || /[+-]\d{2}:\d{2}$/.test(s) || /[+-]\d{4}$/.test(s);
  if (!hasExplicitTz && NAIVE_LOCAL_DATETIME.test(s)) {
    const d = fromZonedTime(s, APP_TIME_ZONE);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}
