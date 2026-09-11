import { isValidFlightDate, lookupFlights, normalizeFlightCode } from './aerodatabox';
import {
  batchUpdateRegistrationFlightApi,
  beginFlightSyncRun,
  finishFlightSyncRun,
  getFlightSyncMeta,
  getRegistrationById,
  listRegistrationsWithoutInstitutions,
  type FlightApiFields,
  type FlightSyncMeta,
} from './db';
import {
  DEFAULT_FLIGHT_LOOKUP_DATE,
  FLIGHT_SYNC_DAILY_UNTIL,
  FLIGHT_SYNC_INTERVAL_DATE,
  FLIGHT_SYNC_INTERVAL_MS,
  FLIGHT_SYNC_TIMEZONE,
  type FlightLookup,
} from './flight-lookup-types';
import { isFlightTransferRegistration } from './flight-transfers';

const ARRIVAL_IATA = new Set(['GRU', 'CGH', 'VCP', 'SAO']);
const STALE_LOCK_MS = 10 * 60 * 1000;

export type FlightSyncMode = 'daily' | 'interval' | 'forced';

export type FlightSyncResult = {
  skipped: boolean;
  reason?: string;
  mode?: FlightSyncMode;
  lookedUp: number;
  updated: number;
  errors: number;
  lastRunAt: string | null;
};

export function saoPauloDate(now = new Date()): string {
  return now.toLocaleDateString('en-CA', { timeZone: FLIGHT_SYNC_TIMEZONE });
}

export function composeOutboundFlightCode(airline?: string, number?: string): string | null {
  const num = normalizeFlightCode(number ?? '');
  if (!num) return null;
  if (/^[A-Z]{2}\d{1,5}[A-Z]?$/.test(num) || /^[A-Z]{3}\d{1,4}$/.test(num)) return num;
  const air = normalizeFlightCode(airline ?? '');
  const prefix = air.match(/^([A-Z]{2,3})/)?.[1] ?? '';
  if (prefix && /^\d+[A-Z]?$/.test(num)) return `${prefix}${num}`;
  return num;
}

export function resolveFlightLookupDate(stored?: string): string {
  const value = stored?.trim() ?? '';
  if (isValidFlightDate(value)) return value;
  return DEFAULT_FLIGHT_LOOKUP_DATE;
}

export function pickArrivalFlight(flights: FlightLookup[]): FlightLookup | null {
  if (flights.length === 0) return null;
  return (
    flights.find((flight) => ARRIVAL_IATA.has((flight.destinationIata ?? '').toUpperCase())) ??
    flights[0]
  );
}

function isLockStale(meta: FlightSyncMeta, nowMs: number): boolean {
  if (!meta.running) return false;
  if (!meta.running_started_at) return true;
  const started = Date.parse(meta.running_started_at);
  if (Number.isNaN(started)) return true;
  return nowMs - started > STALE_LOCK_MS;
}

export function decideFlightSync(input: {
  now?: Date;
  force?: boolean;
  meta: FlightSyncMeta;
}): { skip: boolean; reason?: string; mode?: FlightSyncMode } {
  const now = input.now ?? new Date();
  const nowMs = now.getTime();
  if (input.meta.running && !isLockStale(input.meta, nowMs)) {
    return { skip: true, reason: 'in_progress' };
  }
  if (input.force) return { skip: false, mode: 'forced' };

  const today = saoPauloDate(now);
  if (today > FLIGHT_SYNC_INTERVAL_DATE) {
    return { skip: true, reason: 'after_event' };
  }
  if (today === FLIGHT_SYNC_INTERVAL_DATE) {
    if (input.meta.last_run_at) {
      const last = Date.parse(input.meta.last_run_at);
      if (!Number.isNaN(last) && nowMs - last < FLIGHT_SYNC_INTERVAL_MS) {
        return { skip: true, reason: 'interval_wait' };
      }
    }
    return { skip: false, mode: 'interval' };
  }
  if (today <= FLIGHT_SYNC_DAILY_UNTIL) {
    if (input.meta.last_daily_run_date === today) {
      return { skip: true, reason: 'already_ran_today' };
    }
    return { skip: false, mode: 'daily' };
  }
  return { skip: true, reason: 'after_event' };
}

async function lookupBestFlight(code: string, date: string): Promise<FlightLookup | null> {
  const arrival = await lookupFlights(code, date, { dateLocalRole: 'Arrival' });
  const pickedArrival = pickArrivalFlight(arrival.flights);
  if (pickedArrival) return pickedArrival;
  const departure = await lookupFlights(code, date, { dateLocalRole: 'Departure' });
  return pickArrivalFlight(departure.flights);
}

function extractClockTime(formatted: string | null | undefined): string | undefined {
  const match = formatted?.trim().match(/(\d{2}:\d{2})(?::\d{2})?/);
  return match?.[1];
}

function emptyFlightApiSnapshot(error: string): Omit<FlightApiFields, 'flight_api_updated_at'> {
  return {
    flight_api_departure_time: '',
    flight_api_arrival_time: '',
    flight_api_arrival_terminal: '',
    flight_api_destination_iata: '',
    flight_api_status: '',
    flight_api_error: error,
  };
}

function snapshotFromFlight(flight: FlightLookup): Omit<FlightApiFields, 'flight_api_updated_at'> {
  const departureClock = extractClockTime(flight.departureTime);
  return {
    flight_api_departure_time: flight.departureTime ?? '',
    flight_api_arrival_time: flight.arrivalTime ?? '',
    flight_api_arrival_terminal: flight.arrivalTerminal ?? '',
    flight_api_destination_iata: (flight.destinationIata ?? '').toUpperCase(),
    flight_api_status: flight.status ?? '',
    flight_api_error: '',
    ...(departureClock ? { flight_departure_time: departureClock } : {}),
  };
}

export async function runFlightSync(options?: { force?: boolean }): Promise<FlightSyncResult> {
  const force = options?.force === true;
  const started = await beginFlightSyncRun({
    shouldSkip: (meta) => decideFlightSync({ force, meta }),
  });

  if (started.skipped) {
    return {
      skipped: true,
      reason: started.reason,
      lookedUp: started.meta.last_looked_up,
      updated: started.meta.last_updated,
      errors: started.meta.last_errors,
      lastRunAt: started.meta.last_run_at,
    };
  }

  const mode = decideFlightSync({ force, meta: { ...started.meta, running: false } }).mode ?? 'daily';
  const updatedAt = new Date().toISOString();
  let lookedUp = 0;
  let errors = 0;

  try {
    const registrations = (await listRegistrationsWithoutInstitutions()).filter(isFlightTransferRegistration);
    const groups = new Map<string, typeof registrations>();
    const unresolved: typeof registrations = [];

    for (const reg of registrations) {
      const code = composeOutboundFlightCode(reg.flight_departure_airline, reg.flight_departure_number);
      if (!code) {
        unresolved.push(reg);
        continue;
      }
      const date = resolveFlightLookupDate(reg.flight_departure_date);
      const key = `${code}|${date}`;
      const list = groups.get(key) ?? [];
      list.push(reg);
      groups.set(key, list);
    }

    const updates: Array<{ id: string } & FlightApiFields> = [];

    for (const reg of unresolved) {
      updates.push({
        id: reg.id,
        ...emptyFlightApiSnapshot('missing_flight_code'),
        flight_api_updated_at: updatedAt,
      });
      errors += 1;
    }

    for (const [key, group] of groups) {
      const [code, date] = key.split('|');
      lookedUp += 1;
      let snapshot: Omit<FlightApiFields, 'flight_api_updated_at'>;
      try {
        const flight = await lookupBestFlight(code, date);
        if (!flight) {
          snapshot = emptyFlightApiSnapshot('not_found');
          errors += group.length;
        } else {
          snapshot = snapshotFromFlight(flight);
        }
      } catch (error) {
        const codeName = error && typeof error === 'object' && 'code' in error ? String(error.code) : 'provider_error';
        snapshot = emptyFlightApiSnapshot(codeName);
        errors += group.length;
      }
      for (const reg of group) {
        updates.push({
          id: reg.id,
          ...snapshot,
          flight_api_updated_at: updatedAt,
        });
      }
    }

    if (updates.length > 0) {
      await batchUpdateRegistrationFlightApi(updates);
    }

    const today = saoPauloDate();
    await finishFlightSyncRun({
      last_daily_run_date: mode === 'daily' || mode === 'forced' ? today : started.meta.last_daily_run_date,
      last_run_at: updatedAt,
      last_run_mode: mode,
      last_skip_reason: null,
      last_looked_up: lookedUp,
      last_updated: updates.length,
      last_errors: errors,
    });

    return {
      skipped: false,
      mode,
      lookedUp,
      updated: updates.length,
      errors,
      lastRunAt: updatedAt,
    };
  } catch (error) {
    await finishFlightSyncRun({
      last_skip_reason: 'failed',
    });
    throw error;
  }
}

export async function getFlightSyncStatus(): Promise<FlightSyncMeta> {
  return getFlightSyncMeta();
}

export type SingleFlightSyncResult =
  | { ok: false; reason: 'not_found' | 'ineligible' }
  | ({ ok: true; id: string } & FlightApiFields);

export async function syncRegistrationFlight(registrationId: string): Promise<SingleFlightSyncResult> {
  const reg = await getRegistrationById(registrationId);
  if (!reg) return { ok: false, reason: 'not_found' };
  if (!isFlightTransferRegistration(reg)) return { ok: false, reason: 'ineligible' };

  const updatedAt = new Date().toISOString();
  const code = composeOutboundFlightCode(reg.flight_departure_airline, reg.flight_departure_number);
  let snapshot: Omit<FlightApiFields, 'flight_api_updated_at'>;

  if (!code) {
    snapshot = emptyFlightApiSnapshot('missing_flight_code');
  } else {
    const date = resolveFlightLookupDate(reg.flight_departure_date);
    try {
      const flight = await lookupBestFlight(code, date);
      if (!flight) {
        snapshot = emptyFlightApiSnapshot('not_found');
      } else {
        snapshot = snapshotFromFlight(flight);
      }
    } catch (error) {
      const codeName = error && typeof error === 'object' && 'code' in error ? String(error.code) : 'provider_error';
      snapshot = emptyFlightApiSnapshot(codeName);
    }
  }

  const fields: FlightApiFields = { ...snapshot, flight_api_updated_at: updatedAt };
  await batchUpdateRegistrationFlightApi([{ id: reg.id, ...fields }]);
  return { ok: true, id: reg.id, ...fields };
}
