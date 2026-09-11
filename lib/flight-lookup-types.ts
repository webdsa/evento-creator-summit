/** Data padrão da consulta de voos (chegada ao evento). */
export const DEFAULT_FLIGHT_LOOKUP_DATE = '2026-09-14';

/** Até este dia (inclusive), a rotina consulta a API 1x por dia (fuso America/Sao_Paulo). */
export const FLIGHT_SYNC_DAILY_UNTIL = '2026-09-13';

/** Neste dia a rotina consulta a API a cada 30 minutos. */
export const FLIGHT_SYNC_INTERVAL_DATE = '2026-09-14';

export const FLIGHT_SYNC_INTERVAL_MS = 30 * 60 * 1000;

export const FLIGHT_SYNC_TIMEZONE = 'America/Sao_Paulo';

export type FlightLookup = {
  flightIata: string | null;
  flightIcao: string | null;
  flightNumber: string | null;
  airline: string | null;
  originAirport: string | null;
  originIata: string | null;
  destinationAirport: string | null;
  destinationIata: string | null;
  departureTime: string | null;
  arrivalTime: string | null;
  departureTerminal: string | null;
  arrivalTerminal: string | null;
  status: string | null;
  flightDate: string | null;
};
