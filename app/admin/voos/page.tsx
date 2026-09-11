'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AdminProtected } from '@/components/AdminProtected';
import { useLanguage } from '@/lib/i18n';
import { useAuth } from '@/lib/AuthProvider';
import { fetchWithAuth } from '@/lib/admin-api';
import { getRegistrationInstitutionName, isFlightTransferRegistration } from '@/lib/flight-transfers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Download, Loader2, RefreshCw, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';

interface FlightRow {
  id: string;
  full_name: string;
  phone: string;
  status: 'confirmed' | 'canceled';
  own_transport?: boolean;
  institution_name?: string;
  institution?: { name: string };
  flight_departure_airline?: string;
  flight_departure_number?: string;
  flight_departure_time?: string;
  flight_api_departure_time?: string;
  flight_api_arrival_time?: string;
  flight_api_arrival_terminal?: string;
  flight_api_destination_iata?: string;
  flight_api_status?: string;
  flight_api_updated_at?: string;
}

const PAGE_SIZE_OPTIONS = [10, 20, 30, 50, 100] as const;

type SortBy = 'name' | 'arrival';
type SortOrder = 'asc' | 'desc';

function dash(value: string | undefined): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : '—';
}

function getWhatsAppLink(phone: string | undefined): string | null {
  const digits = (phone ?? '').replace(/\D/g, '');
  if (!digits) return null;
  return `https://api.whatsapp.com/send?phone=${digits}`;
}

function isNonGruDestination(iata: string | undefined): boolean {
  const code = iata?.trim().toUpperCase();
  return Boolean(code) && code !== 'GRU';
}

function hasFlightInfo(reg: FlightRow): boolean {
  return Boolean(reg.flight_departure_airline?.trim() || reg.flight_departure_number?.trim());
}

function arrivalSortValue(value: string | undefined): number {
  const raw = value?.trim() ?? '';
  if (!raw) return Number.NaN;
  const local = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}:\d{2})/);
  if (local) {
    const parsed = Date.parse(`${local[3]}-${local[2]}-${local[1]}T${local[4]}:00`);
    return Number.isNaN(parsed) ? Number.NaN : parsed;
  }
  const parsed = Date.parse(raw);
  return Number.isNaN(parsed) ? Number.NaN : parsed;
}

function compareNames(a: FlightRow, b: FlightRow): number {
  return (a.full_name ?? '').localeCompare(b.full_name ?? '', undefined, { sensitivity: 'base' });
}

function compareArrival(a: FlightRow, b: FlightRow): number {
  const timeA = arrivalSortValue(a.flight_api_arrival_time);
  const timeB = arrivalSortValue(b.flight_api_arrival_time);
  const aEmpty = Number.isNaN(timeA);
  const bEmpty = Number.isNaN(timeB);
  if (aEmpty && bEmpty) return 0;
  if (aEmpty) return 1;
  if (bEmpty) return -1;
  return timeA - timeB;
}

function statusBadgeVariant(status: string | undefined) {
  const key = status?.trim().toLowerCase() ?? '';
  if (key === 'cancelled' || key === 'canceled' || key === 'incident' || key === 'diverted') {
    return 'destructive' as const;
  }
  return 'secondary' as const;
}

function formatSyncTime(iso: string | null | undefined, locale: string): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'America/Sao_Paulo',
  }).format(date);
}

export default function FlightsPage() {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const { user, getIdToken } = useAuth();
  const [registrations, setRegistrations] = useState<FlightRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [lastRunAt, setLastRunAt] = useState<string | null>(null);
  const [filterName, setFilterName] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('arrival');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [pageSize, setPageSize] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);

  const loadFlights = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth(getIdToken, '/api/admin/registrations');
      if (!res.ok) throw new Error('Failed to load');
      const data = (await res.json()) as FlightRow[];
      setRegistrations(Array.isArray(data) ? data : []);
    } catch {
      toast({
        title: t.errors.genericError,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [getIdToken, t.errors.genericError, toast]);

  const loadSyncStatus = useCallback(async () => {
    try {
      const res = await fetchWithAuth(getIdToken, '/api/admin/flights/sync');
      if (!res.ok) return;
      const data = (await res.json()) as { last_run_at?: string | null };
      setLastRunAt(data.last_run_at ?? null);
    } catch {
      /* status is optional */
    }
  }, [getIdToken]);

  const syncFlights = useCallback(async () => {
      setSyncing(true);
      try {
        const res = await fetchWithAuth(getIdToken, '/api/admin/flights/sync?force=1', { method: 'POST' });
        const data = (await res.json()) as {
          skipped?: boolean;
          lastRunAt?: string | null;
          error?: string;
        };
        if (!res.ok) throw new Error(data.error || 'sync_failed');
        setLastRunAt(data.lastRunAt ?? null);
        await loadFlights();
        toast({
          title: data.skipped ? t.admin.flights.syncSkipped : t.admin.flights.syncDone,
        });
      } catch {
        toast({
          title: t.errors.genericError,
          variant: 'destructive',
        });
      } finally {
        setSyncing(false);
      }
    }, [getIdToken, loadFlights, t.admin.flights.syncDone, t.admin.flights.syncSkipped, t.errors.genericError, toast]);

  const syncOneFlight = useCallback(
    async (registrationId: string) => {
      setSyncingId(registrationId);
      try {
        const res = await fetchWithAuth(getIdToken, `/api/admin/flights/sync/${registrationId}`, {
          method: 'POST',
        });
        const data = (await res.json()) as {
          flight_api_departure_time?: string;
          flight_api_arrival_time?: string;
          flight_api_arrival_terminal?: string;
          flight_api_destination_iata?: string;
          flight_api_status?: string;
          flight_api_updated_at?: string;
          flight_api_error?: string;
          flight_departure_time?: string;
          error?: string;
        };
        if (!res.ok) throw new Error(data.error || 'sync_failed');
        setRegistrations((prev) =>
          prev.map((reg) =>
            reg.id === registrationId
              ? {
                  ...reg,
                  flight_api_departure_time: data.flight_api_departure_time ?? '',
                  flight_api_arrival_time: data.flight_api_arrival_time ?? '',
                  flight_api_arrival_terminal: data.flight_api_arrival_terminal ?? '',
                  flight_api_destination_iata: data.flight_api_destination_iata ?? '',
                  flight_api_status: data.flight_api_status ?? '',
                  flight_api_updated_at: data.flight_api_updated_at,
                  ...(data.flight_departure_time
                    ? { flight_departure_time: data.flight_departure_time }
                    : {}),
                }
              : reg
          )
        );
        toast({
          title: data.flight_api_error === 'not_found' ? t.admin.flights.syncOneNotFound : t.admin.flights.syncOneDone,
          variant: data.flight_api_error === 'not_found' ? 'destructive' : 'default',
        });
      } catch {
        toast({
          title: t.errors.genericError,
          variant: 'destructive',
        });
      } finally {
        setSyncingId(null);
      }
    },
    [getIdToken, t.admin.flights.syncOneDone, t.admin.flights.syncOneNotFound, t.errors.genericError, toast]
  );

  useEffect(() => {
    if (!user) return;
    void loadFlights();
    void loadSyncStatus();
  }, [user, loadFlights, loadSyncStatus]);

  const flightRows = useMemo(
    () => registrations.filter(isFlightTransferRegistration),
    [registrations]
  );

  const filteredRows = useMemo(() => {
    const query = filterName.trim().toLowerCase();
    const queryDigits = query.replace(/\D/g, '');
    const rows = query
      ? flightRows.filter((reg) => {
          const nameMatch = (reg.full_name ?? '').toLowerCase().includes(query);
          const phoneDigits = (reg.phone ?? '').replace(/\D/g, '');
          const phoneMatch =
            (reg.phone ?? '').toLowerCase().includes(query) ||
            (queryDigits.length > 0 && phoneDigits.includes(queryDigits));
          return nameMatch || phoneMatch;
        })
      : flightRows;
    return [...rows].sort((a, b) => {
      if (sortBy === 'name') {
        const nameCmp = compareNames(a, b);
        const directed = sortOrder === 'asc' ? nameCmp : -nameCmp;
        if (directed !== 0) return directed;
        return compareArrival(a, b);
      }
      const timeA = arrivalSortValue(a.flight_api_arrival_time);
      const timeB = arrivalSortValue(b.flight_api_arrival_time);
      const aEmpty = Number.isNaN(timeA);
      const bEmpty = Number.isNaN(timeB);
      if (aEmpty !== bEmpty) return aEmpty ? 1 : -1;
      if (!aEmpty && timeA !== timeB) {
        return sortOrder === 'asc' ? timeA - timeB : timeB - timeA;
      }
      return compareNames(a, b);
    });
  }, [flightRows, filterName, sortBy, sortOrder]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterName, pageSize, sortBy, sortOrder]);

  const totalFiltered = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const paginatedRows = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, pageSize, safePage]);

  const syncLabel = formatSyncTime(lastRunAt, language === 'es' ? 'es' : 'pt-BR');

  const statusLabel = useMemo(
    () =>
      ({
        scheduled: t.admin.flightLookup.statusScheduled,
        active: t.admin.flightLookup.statusActive,
        landed: t.admin.flightLookup.statusLanded,
        cancelled: t.admin.flightLookup.statusCancelled,
        canceled: t.admin.flightLookup.statusCancelled,
        incident: t.admin.flightLookup.statusIncident,
        diverted: t.admin.flightLookup.statusDiverted,
      }) as Record<string, string>,
    [t.admin.flightLookup]
  );

  const formatFlightStatus = (status: string | undefined) => {
    const key = status?.trim().toLowerCase() ?? '';
    if (!key) return null;
    return statusLabel[key] ?? status?.trim();
  };

  const toggleSort = (column: SortBy) => {
    if (sortBy === column) {
      setSortOrder((order) => (order === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortBy(column);
    setSortOrder('asc');
  };

  const sortIcon = (column: SortBy) => {
    if (sortBy !== column) return <ArrowUpDown className="h-4 w-4 text-muted-foreground" />;
    return sortOrder === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />;
  };

  const exportToXLSX = () => {
    const rows = filteredRows.map((reg) => ({
      [t.admin.flights.name]: reg.full_name ?? '',
      [t.admin.flights.whatsapp]: reg.phone ?? '',
      [t.admin.registrations.institution]: getRegistrationInstitutionName(reg),
      [t.admin.flights.airline]: reg.flight_departure_airline ?? '',
      [t.admin.flights.number]: reg.flight_departure_number ?? '',
      [t.admin.flights.arrivalTime]: reg.flight_api_arrival_time ?? '',
      [t.admin.flights.arrivalTerminal]: reg.flight_api_arrival_terminal ?? '',
      [t.admin.flights.destinationAirport]: reg.flight_api_destination_iata ?? '',
      [t.admin.flights.status]: formatFlightStatus(reg.flight_api_status) ?? '',
    }));
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, t.admin.flights.title);
    XLSX.writeFile(workbook, 'voos-ida.xlsx');
  };

  return (
    <AdminProtected>
      <div className="space-y-6">
        <div className="flex justify-between items-center gap-2 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold">{t.admin.flights.title}</h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{t.admin.flights.subtitle}</p>
            <p className="text-xs text-muted-foreground mt-2">
              {syncLabel
                ? t.admin.flights.lastSync.replace('{time}', syncLabel)
                : t.admin.flights.neverSynced}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => void syncFlights()}
              className="gap-2"
              disabled={syncing || syncingId !== null}
            >
              {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              {t.admin.flights.syncNow}
            </Button>
            <Button onClick={exportToXLSX} className="gap-2" disabled={filteredRows.length === 0}>
              <Download className="h-4 w-4" />
              {t.admin.registrations.exportXLSX}
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t.admin.flights.title}</CardTitle>
            <CardDescription>
              {t.admin.registrations.showingOf
                .replace('{from}', totalFiltered === 0 ? '0' : String((safePage - 1) * pageSize + 1))
                .replace('{to}', String(Math.min(safePage * pageSize, totalFiltered)))
                .replace('{total}', String(totalFiltered))}
            </CardDescription>
            <div className="pt-4 max-w-sm">
              <label className="text-sm font-medium text-gray-700">
                {t.admin.registrations.fullName} / {t.admin.registrations.phone}
              </label>
              <Input
                placeholder={t.common.search}
                value={filterName}
                onChange={(e) => setFilterName(e.target.value)}
                className="h-9 mt-1.5"
              />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : filteredRows.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">{t.admin.flights.empty}</p>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="-ml-2 h-8 gap-1 font-medium hover:bg-muted"
                          onClick={() => toggleSort('name')}
                        >
                          {t.admin.flights.name}
                          {sortIcon('name')}
                        </Button>
                      </TableHead>
                      <TableHead>{t.admin.flights.whatsapp}</TableHead>
                      <TableHead>{t.admin.registrations.institution}</TableHead>
                      <TableHead>{t.admin.flights.airline}</TableHead>
                      <TableHead>{t.admin.flights.number}</TableHead>
                      <TableHead>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="-ml-2 h-8 gap-1 font-medium hover:bg-muted"
                          onClick={() => toggleSort('arrival')}
                        >
                          {t.admin.flights.arrivalTime}
                          {sortIcon('arrival')}
                        </Button>
                      </TableHead>
                      <TableHead>{t.admin.flights.arrivalTerminal}</TableHead>
                      <TableHead>{t.admin.flights.destinationAirport}</TableHead>
                      <TableHead>{t.admin.flights.status}</TableHead>
                      <TableHead className="w-[64px]">{t.admin.flights.syncColumn}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedRows.map((reg) => {
                      const whatsappHref = getWhatsAppLink(reg.phone);
                      const canSyncRow = hasFlightInfo(reg);
                      const flightStatus = formatFlightStatus(reg.flight_api_status);
                      return (
                      <TableRow
                        key={reg.id}
                        className={isNonGruDestination(reg.flight_api_destination_iata) ? 'text-red-600' : undefined}
                      >
                        <TableCell className="font-medium">{dash(reg.full_name)}</TableCell>
                        <TableCell>
                          {whatsappHref ? (
                            <a
                              href={whatsappHref}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-green-600 hover:underline"
                            >
                              {reg.phone}
                            </a>
                          ) : (
                            dash(reg.phone)
                          )}
                        </TableCell>
                        <TableCell>{dash(getRegistrationInstitutionName(reg))}</TableCell>
                        <TableCell>{dash(reg.flight_departure_airline)}</TableCell>
                        <TableCell>{dash(reg.flight_departure_number)}</TableCell>
                        <TableCell>{dash(reg.flight_api_arrival_time)}</TableCell>
                        <TableCell>{dash(reg.flight_api_arrival_terminal)}</TableCell>
                        <TableCell>{dash(reg.flight_api_destination_iata)}</TableCell>
                        <TableCell>
                          {flightStatus ? (
                            <Badge variant={statusBadgeVariant(reg.flight_api_status)}>{flightStatus}</Badge>
                          ) : (
                            dash(undefined)
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title={t.admin.flights.syncOne}
                            aria-label={t.admin.flights.syncOne}
                            disabled={!canSyncRow || syncing || syncingId !== null}
                            onClick={() => void syncOneFlight(reg.id)}
                          >
                            {syncingId === reg.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <RefreshCw className="h-4 w-4" />
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                {totalFiltered > 0 && (
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">{t.admin.registrations.perPage}</span>
                      <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
                        <SelectTrigger className="h-9 w-[80px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PAGE_SIZE_OPTIONS.map((size) => (
                            <SelectItem key={size} value={String(size)}>
                              {size}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={safePage <= 1}
                      >
                        {t.admin.registrations.previous}
                      </Button>
                      <span className="text-sm text-muted-foreground px-2">
                        {safePage} / {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={safePage >= totalPages}
                      >
                        {t.admin.registrations.nextPage}
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminProtected>
  );
}
