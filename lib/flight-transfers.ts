/** Instituições internas que não entram na lista de voos de ida. */
export const EXCLUDED_FLIGHT_INSTITUTION_CODES = [
  'Novo Tempo',
  'DSA',
  'UCOB',
  'IATEC',
  'CPB',
  'UCB',
] as const;

export type FlightTransferRegistration = {
  id?: string;
  full_name?: string;
  phone?: string;
  status?: string;
  own_transport?: boolean;
  institution_name?: string;
  institution?: { name?: string } | { name?: string }[] | null;
  flight_departure_airline?: string;
  flight_departure_number?: string;
  flight_departure_time?: string;
  flight_departure_date?: string;
  flight_api_departure_time?: string;
  flight_api_arrival_time?: string;
  flight_api_arrival_terminal?: string;
  flight_api_destination_iata?: string;
  flight_api_status?: string;
  flight_api_updated_at?: string;
  flight_api_error?: string;
};

export function normalizeInstitutionKey(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim();
}

export function getRegistrationInstitutionName(reg: FlightTransferRegistration): string {
  if (typeof reg.institution_name === 'string' && reg.institution_name.trim()) {
    return reg.institution_name.trim();
  }
  const inst = reg.institution;
  if (inst && !Array.isArray(inst) && typeof inst.name === 'string') {
    return inst.name.trim();
  }
  return '';
}

/** True se o nome da instituição for Novo Tempo, DSA, UCoB, IATeC, CPB ou UCB. */
export function isExcludedFlightInstitution(name: string | undefined | null): boolean {
  const normalized = normalizeInstitutionKey(name ?? '');
  if (!normalized) return false;
  const compact = normalized.replace(/ /g, '');
  const tokens = normalized.split(' ').filter(Boolean);
  return EXCLUDED_FLIGHT_INSTITUTION_CODES.some((code) => {
    const codeNorm = normalizeInstitutionKey(code);
    const codeCompact = codeNorm.replace(/ /g, '');
    return compact === codeCompact || tokens.includes(codeNorm);
  });
}

/**
 * Participantes que precisam de voo/transfer:
 * - sem "Transporte próprio"
 * - fora das instituições Novo Tempo, DSA, UCoB, IATeC, CPB, UCB
 * - inscrição confirmada
 */
export function isFlightTransferRegistration(reg: FlightTransferRegistration): boolean {
  if (reg.status && reg.status !== 'confirmed') return false;
  if (reg.own_transport === true) return false;
  if (isExcludedFlightInstitution(getRegistrationInstitutionName(reg))) return false;
  return true;
}
