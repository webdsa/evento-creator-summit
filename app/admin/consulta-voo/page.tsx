'use client';

import { FormEvent, useMemo, useState } from 'react';
import { AdminProtected } from '@/components/AdminProtected';
import { useLanguage } from '@/lib/i18n';
import { useAuth } from '@/lib/AuthProvider';
import { fetchWithAuth } from '@/lib/admin-api';
import { DEFAULT_FLIGHT_LOOKUP_DATE, type FlightLookup } from '@/lib/flight-lookup-types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Search } from 'lucide-react';

export const dynamic = 'force-dynamic';

function dash(value: string | null | undefined): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : '—';
}

export default function FlightLookupPage() {
  const { t } = useLanguage();
  const { getIdToken } = useAuth();
  const [flight, setFlight] = useState('');
  const [date, setDate] = useState(DEFAULT_FLIGHT_LOOKUP_DATE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<FlightLookup[] | null>(null);
  const [debug, setDebug] = useState<unknown>(null);

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

  const errorLabel = (code: string | undefined) => {
    switch (code) {
      case 'missing_api_key':
        return t.admin.flightLookup.errorMissingKey;
      case 'invalid_flight_code':
        return t.admin.flightLookup.errorInvalidFlight;
      case 'invalid_date':
        return t.admin.flightLookup.errorInvalidDate;
      case 'missing_params':
        return t.admin.flightLookup.errorMissingParams;
      case 'rate_limited':
        return t.errors.rateLimitExceeded;
      case 'function_access_restricted':
        return t.admin.flightLookup.errorPlanRestricted;
      case 'usage_limit_reached':
        return t.admin.flightLookup.errorUsageLimit;
      case 'invalid_access_key':
      case 'missing_access_key':
        return t.admin.flightLookup.errorInvalidKey;
      case 'not_subscribed':
        return t.admin.flightLookup.errorNotSubscribed;
      default:
        return t.admin.flightLookup.errorGeneric;
    }
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setResults(null);
    setDebug(null);
    try {
      const params = new URLSearchParams({
        flight: flight.trim(),
        date,
      });
      const res = await fetchWithAuth(getIdToken, `/api/admin/flights/lookup?${params.toString()}`);
      const data = await res.json();
      setDebug(data.debug ?? data);
      if (!res.ok) {
        setError(errorLabel(data.error));
        return;
      }
      setResults(Array.isArray(data.flights) ? data.flights : []);
    } catch (requestError) {
      setError(t.admin.flightLookup.errorGeneric);
      setDebug({ requestError: String(requestError) });
    } finally {
      setLoading(false);
    }
  };

  const statusVariant = (status: string | null) => {
    if (status === 'landed' || status === 'scheduled' || status === 'active') return 'default' as const;
    if (status === 'cancelled' || status === 'canceled' || status === 'incident') return 'destructive' as const;
    return 'secondary' as const;
  };

  return (
    <AdminProtected>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">{t.admin.flightLookup.title}</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{t.admin.flightLookup.subtitle}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t.admin.flightLookup.formTitle}</CardTitle>
            <CardDescription>{t.admin.flightLookup.formHint}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
              <div className="space-y-1.5">
                <Label htmlFor="flight-code">{t.admin.flightLookup.flightCode}</Label>
                <Input
                  id="flight-code"
                  value={flight}
                  onChange={(e) => setFlight(e.target.value.toUpperCase())}
                  placeholder={t.admin.flightLookup.flightCodePlaceholder}
                  className="font-mono"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="flight-date">{t.admin.flightLookup.travelDate}</Label>
                <Input
                  id="flight-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="gap-2" disabled={loading || !flight.trim() || !date}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                {t.admin.flightLookup.search}
              </Button>
            </form>
          </CardContent>
        </Card>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {results && results.length === 0 && !error && (
          <p className="text-sm text-muted-foreground">{t.admin.flightLookup.empty}</p>
        )}

        {results && results.length > 0 && (
          <div className="grid gap-4">
            {results.map((item, index) => (
              <Card key={`${item.flightIata ?? item.flightIcao ?? 'flight'}-${index}`}>
                <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
                  <div>
                    <CardTitle className="text-lg font-mono">
                      {item.flightIata || item.flightIcao || item.flightNumber || t.admin.flightLookup.title}
                    </CardTitle>
                    <CardDescription>{item.airline || '—'}</CardDescription>
                  </div>
                  <Badge variant={statusVariant(item.status)}>
                    {item.status ? statusLabel[item.status] ?? item.status : '—'}
                  </Badge>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">{t.admin.flightLookup.origin}</p>
                    <p className="font-medium">{dash(item.originAirport)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{t.admin.flightLookup.destination}</p>
                    <p className="font-medium">{dash(item.destinationAirport)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{t.admin.flightLookup.departureTime}</p>
                    <p className="font-medium">{dash(item.departureTime)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{t.admin.flightLookup.arrivalTime}</p>
                    <p className="font-medium">{dash(item.arrivalTime)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{t.admin.flightLookup.departureTerminal}</p>
                    <p className="font-medium">{dash(item.departureTerminal)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{t.admin.flightLookup.arrivalTerminal}</p>
                    <p className="font-medium">{dash(item.arrivalTerminal)}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {debug != null && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t.admin.flightLookup.rawResponse}</CardTitle>
              <CardDescription>{t.admin.flightLookup.rawResponseHint}</CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="max-h-96 overflow-auto rounded-md bg-muted p-4 text-xs whitespace-pre-wrap break-all">
                {JSON.stringify(debug, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminProtected>
  );
}
