import { DEFAULT_FLIGHT_LOOKUP_DATE, type FlightLookup } from './flight-lookup-types';

export type { FlightLookup } from './flight-lookup-types';
export { DEFAULT_FLIGHT_LOOKUP_DATE } from './flight-lookup-types';

const DEFAULT_RAPIDAPI_URL = 'https://aerodatabox.p.rapidapi.com';
const DEFAULT_RAPIDAPI_HOST = 'aerodatabox.p.rapidapi.com';
const DEFAULT_APIMARKET_URL = 'https://prod.api.market/api/v1/aedbx/aerodatabox';
const DEFAULT_DIRECT_URL = 'https://api.aerodatabox.com';
const UUID_KEY = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type AeroTime = {
  utc?: string | null;
  local?: string | null;
};

type AeroAirport = {
  iata?: string | null;
  icao?: string | null;
  name?: string | null;
  shortName?: string | null;
  municipalityName?: string | null;
};

type AeroMovement = {
  airport?: AeroAirport | null;
  scheduledTime?: AeroTime | null;
  revisedTime?: AeroTime | null;
  predictedTime?: AeroTime | null;
  runwayTime?: AeroTime | null;
  terminal?: string | number | null;
};

type AeroFlight = {
  number?: string | null;
  callSign?: string | null;
  status?: string | null;
  airline?: { name?: string | null; iata?: string | null; icao?: string | null } | null;
  departure?: AeroMovement | null;
  arrival?: AeroMovement | null;
};

export type FlightLookupDebug = {
  requestUrl: string;
  httpStatus: number | null;
  raw: unknown;
};

export type FlightLookupResult = {
  flights: FlightLookup[];
  debug: FlightLookupDebug;
};

export class FlightLookupError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly httpStatus: number,
    public readonly debug: FlightLookupDebug | null = null
  ) {
    super(message);
    this.name = 'FlightLookupError';
  }
}

export function getAerodataboxApiKey(): string | null {
  const key =
    process.env.AERODATABOX_API_KEY?.trim() ||
    process.env.API_MARKET_KEY?.trim() ||
    process.env.AERODATABOX_RAPIDAPI_KEY?.trim() ||
    process.env.RAPIDAPI_KEY?.trim() ||
    '';
  return key || null;
}

function getRapidApiHost(): string {
  return process.env.AERODATABOX_RAPIDAPI_HOST?.trim() || DEFAULT_RAPIDAPI_HOST;
}

function resolveGateway(apiKey: string): { baseUrl: string; headers: Record<string, string> } {
  const channel = process.env.AERODATABOX_CHANNEL?.trim().toLowerCase();
  const overrideUrl = process.env.AERODATABOX_BASE_URL?.trim().replace(/\/$/, '');
  const jsonHeaders = { Accept: 'application/json' };

  if (channel === 'apimarket') {
    return {
      baseUrl: overrideUrl || DEFAULT_APIMARKET_URL,
      headers: { ...jsonHeaders, 'x-api-market-key': apiKey },
    };
  }

  if (channel === 'rapidapi') {
    return {
      baseUrl: overrideUrl || DEFAULT_RAPIDAPI_URL,
      headers: {
        ...jsonHeaders,
        'X-RapidAPI-Key': apiKey,
        'X-RapidAPI-Host': getRapidApiHost(),
      },
    };
  }

  // UUID = chave do portal direto da AeroDataBox (não RapidAPI nem API.Market).
  if (channel === 'direct' || (!channel && !overrideUrl && UUID_KEY.test(apiKey))) {
    return {
      baseUrl: overrideUrl || DEFAULT_DIRECT_URL,
      headers: { ...jsonHeaders, 'X-Api-Key': apiKey },
    };
  }

  const baseUrl = overrideUrl || DEFAULT_RAPIDAPI_URL;
  const host = getRapidApiHost();
  if (host.includes('rapidapi') || baseUrl.includes('rapidapi')) {
    return {
      baseUrl,
      headers: {
        ...jsonHeaders,
        'X-RapidAPI-Key': apiKey,
        'X-RapidAPI-Host': host,
      },
    };
  }

  return {
    baseUrl,
    headers: { ...jsonHeaders, 'X-Api-Key': apiKey },
  };
}

export function normalizeFlightCode(input: string): string {
  return input.trim().toUpperCase().replace(/[\s-]+/g, '');
}

export function isValidFlightDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

function isValidFlightCode(input: string): boolean {
  const code = normalizeFlightCode(input);
  return /^[A-Z0-9]{2,8}$/.test(code);
}

/** AeroDataBox: no máximo 2 requisições por segundo (todas as consultas do processo). */
const AERODATABOX_MAX_REQUESTS = 2;
const AERODATABOX_WINDOW_MS = 1000;
const AERODATABOX_JITTER_MS = 50;

const recentRequestStarts: number[] = [];
let rateLimitQueue: Promise<void> = Promise.resolve();

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForAerodataboxSlot(): Promise<void> {
  const run = async () => {
    for (;;) {
      const now = Date.now();
      while (recentRequestStarts.length > 0 && now - recentRequestStarts[0] >= AERODATABOX_WINDOW_MS) {
        recentRequestStarts.shift();
      }
      if (recentRequestStarts.length < AERODATABOX_MAX_REQUESTS) {
        recentRequestStarts.push(Date.now());
        return;
      }
      const waitMs = AERODATABOX_WINDOW_MS - (now - recentRequestStarts[0]) + AERODATABOX_JITTER_MS;
      await sleep(Math.max(waitMs, AERODATABOX_JITTER_MS));
    }
  };
  const wait = rateLimitQueue.then(run, run);
  rateLimitQueue = wait.then(
    () => undefined,
    () => undefined
  );
  await wait;
}

function formatTerminal(block: AeroMovement | null | undefined): string | null {
  if (block?.terminal == null) return null;
  const value = String(block.terminal).trim();
  return value || null;
}

function formatAirport(block: AeroMovement | null | undefined): string | null {
  const airport = block?.airport;
  const name = airport?.name?.trim() || airport?.shortName?.trim() || airport?.municipalityName?.trim() || '';
  const iata = airport?.iata?.trim() || '';
  if (name && iata) return `${name} (${iata})`;
  return name || iata || null;
}

function formatLocalTime(block: AeroMovement | null | undefined): string | null {
  const raw =
    block?.runwayTime?.local ||
    block?.revisedTime?.local ||
    block?.predictedTime?.local ||
    block?.scheduledTime?.local ||
    block?.runwayTime?.utc ||
    block?.revisedTime?.utc ||
    block?.scheduledTime?.utc ||
    null;
  if (!raw) return null;
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}:\d{2})/);
  if (match) return `${match[3]}/${match[2]}/${match[1]} ${match[4]}`;
  return raw;
}

function mapStatus(status: string | null | undefined): string | null {
  if (!status) return null;
  const key = status.trim().toLowerCase();
  const map: Record<string, string> = {
    expected: 'scheduled',
    checkin: 'scheduled',
    boarding: 'scheduled',
    gateclosed: 'scheduled',
    delayed: 'scheduled',
    enroute: 'active',
    departed: 'active',
    approaching: 'active',
    arrived: 'landed',
    canceled: 'cancelled',
    cancelled: 'cancelled',
    diverted: 'diverted',
  };
  return map[key.replace(/[\s_-]/g, '')] ?? key;
}

function mapFlight(item: AeroFlight, flightDate: string): FlightLookup {
  const number = item.number?.trim() || null;
  const compact = number ? normalizeFlightCode(number) : null;
  return {
    flightIata: compact,
    flightIcao: item.callSign?.trim() || null,
    flightNumber: number,
    airline: item.airline?.name?.trim() || null,
    originAirport: formatAirport(item.departure),
    originIata: item.departure?.airport?.iata?.trim() || null,
    destinationAirport: formatAirport(item.arrival),
    destinationIata: item.arrival?.airport?.iata?.trim() || null,
    departureTime: formatLocalTime(item.departure),
    arrivalTime: formatLocalTime(item.arrival),
    departureTerminal: formatTerminal(item.departure),
    arrivalTerminal: formatTerminal(item.arrival),
    status: mapStatus(item.status),
    flightDate,
  };
}

function errorCodeFromHttp(status: number, raw: unknown): string {
  const message =
    raw && typeof raw === 'object' && 'message' in raw
      ? String((raw as { message: unknown }).message).toLowerCase()
      : '';
  if (status === 403 && message.includes('not subscribed')) return 'not_subscribed';
  if (message.includes('inactive api key') || message.includes('invalid or inactive')) {
    return 'invalid_access_key';
  }
  if (status === 401 || status === 403) return 'invalid_access_key';
  if (status === 429) return 'usage_limit_reached';
  return 'provider_error';
}

export async function lookupFlights(
  flightCode: string,
  flightDate: string = DEFAULT_FLIGHT_LOOKUP_DATE,
  options?: { dateLocalRole?: 'Departure' | 'Arrival' }
): Promise<FlightLookupResult> {
  const apiKey = getAerodataboxApiKey();
  if (!apiKey) {
    throw new FlightLookupError('missing_api_key', 'missing_api_key', 503);
  }
  if (!isValidFlightCode(flightCode)) {
    throw new FlightLookupError('invalid_flight_code', 'invalid_flight_code', 400);
  }
  if (!isValidFlightDate(flightDate)) {
    throw new FlightLookupError('invalid_date', 'invalid_date', 400);
  }

  const number = normalizeFlightCode(flightCode);
  const { baseUrl, headers } = resolveGateway(apiKey);
  const dateLocalRole = options?.dateLocalRole === 'Arrival' ? 'Arrival' : 'Departure';
  const requestUrl = `${baseUrl}/flights/Number/${encodeURIComponent(number)}/${flightDate}?dateLocalRole=${dateLocalRole}`;

  await waitForAerodataboxSlot();

  let res: Response;
  try {
    res = await fetch(requestUrl, { method: 'GET', headers, cache: 'no-store' });
  } catch (networkError) {
    throw new FlightLookupError('provider_error', 'provider_error', 502, {
      requestUrl,
      httpStatus: null,
      raw: { networkError: String(networkError) },
    });
  }

  const text = await res.text();
  let raw: unknown = text;
  if (text) {
    try {
      raw = JSON.parse(text);
    } catch {
      raw = text;
    }
  }

  const debug: FlightLookupDebug = { requestUrl, httpStatus: res.status, raw };

  if (res.status === 204 || res.status === 404) {
    return { flights: [], debug };
  }

  if (!res.ok) {
    throw new FlightLookupError(errorCodeFromHttp(res.status, raw), errorCodeFromHttp(res.status, raw), 502, debug);
  }

  const list = Array.isArray(raw) ? (raw as AeroFlight[]) : [];
  return { flights: list.map((item) => mapFlight(item, flightDate)), debug };
}
