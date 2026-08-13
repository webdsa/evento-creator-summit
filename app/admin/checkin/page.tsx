'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { AdminProtected } from '@/components/AdminProtected';
import { useLanguage } from '@/lib/i18n';
import { useAuth } from '@/lib/AuthProvider';
import { fetchWithAuth } from '@/lib/admin-api';
import { QRScanner } from '@/components/QRScanner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, QrCode, Loader2, UserCheck, AlertCircle, CalendarClock } from 'lucide-react';
import { formatInAppTz } from '@/lib/app-timezone';

export const dynamic = 'force-dynamic';

const CONFIRM_COUNTDOWN_SECONDS = 3;

type LookupResult = {
  id: string;
  registrationCode: string;
  fullName: string;
  checkedInAt: string | null;
};

export default function AdminCheckinPage() {
  const { t } = useLanguage();
  const { getIdToken } = useAuth();
  const [code, setCode] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [lookupResult, setLookupResult] = useState<LookupResult | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [confirmSuccess, setConfirmSuccess] = useState<string | null>(null);
  const [confirmAlready, setConfirmAlready] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [scannerKey, setScannerKey] = useState(0);

  const doLookup = useCallback(
    async (codeValue: string) => {
      const c = codeValue.trim().toUpperCase();
      if (!c) return;
      setLookupError(null);
      setLookupResult(null);
      setConfirmSuccess(null);
      setConfirmAlready(false);
      setCountdown(null);
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
      setLookupLoading(true);
      try {
        const res = await fetchWithAuth(
          getIdToken,
          `/api/admin/checkin/lookup?code=${encodeURIComponent(c)}`
        );
        const data = await res.json();
        if (!res.ok) {
          if (res.status === 404) setLookupError(t.admin.checkin.notFound);
          else if (data.error === 'registration_canceled') setLookupError(t.admin.checkin.canceled);
          else setLookupError(t.admin.checkin.errorGeneric);
          return;
        }
        setLookupResult(data);
        setCode(c);
      } catch {
        setLookupError(t.admin.checkin.errorGeneric);
      } finally {
        setLookupLoading(false);
      }
    },
    [getIdToken, t.admin.checkin]
  );

  const handleScan = useCallback(
    (scannedCode: string) => {
      const c = scannedCode.trim().toUpperCase();
      if (c && !lookupLoading) doLookup(c);
    },
    [doLookup, lookupLoading]
  );

  const handleConfirmCheckin = useCallback(async () => {
    if (!lookupResult || lookupResult.checkedInAt) return;
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setCountdown(null);
    setConfirmLoading(true);
    setConfirmSuccess(null);
    setConfirmAlready(false);
    try {
      const res = await fetchWithAuth(getIdToken, '/api/admin/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: lookupResult.registrationCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLookupError(t.admin.checkin.errorGeneric);
        return;
      }
      if (data.alreadyCheckedIn) {
        setConfirmAlready(true);
        setLookupResult((r) => (r ? { ...r, checkedInAt: data.checkedInAt ?? r.checkedInAt } : r));
      } else {
        setConfirmSuccess(data.fullName ?? lookupResult.fullName);
        const at =
          typeof data.checkedInAt === 'string' && data.checkedInAt ? data.checkedInAt : new Date().toISOString();
        setLookupResult((r) => (r ? { ...r, checkedInAt: at } : r));
      }
      resetAndScanAgainRef.current?.();
    } catch {
      setLookupError(t.admin.checkin.errorGeneric);
    } finally {
      setConfirmLoading(false);
    }
  }, [lookupResult, getIdToken, t.admin.checkin]);

  const resetAndScanAgain = useCallback(() => {
    setCode('');
    setLookupResult(null);
    setLookupError(null);
    setConfirmSuccess(null);
    setConfirmAlready(false);
    setCountdown(null);
    setScannerKey((k) => k + 1);
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  }, []);
  const resetAndScanAgainRef = useRef(resetAndScanAgain);
  resetAndScanAgainRef.current = resetAndScanAgain;

  useEffect(() => {
    if (!lookupResult || lookupResult.checkedInAt || confirmLoading) {
      setCountdown(null);
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
      return;
    }
    setCountdown(CONFIRM_COUNTDOWN_SECONDS);
    countdownIntervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null || prev <= 0) return prev;
        if (prev <= 1) {
          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
    };
  }, [lookupResult?.id, lookupResult?.checkedInAt, confirmLoading]);

  useEffect(() => {
    if (countdown === 0) {
      setCountdown(null);
      handleConfirmCheckin();
    }
  }, [countdown, handleConfirmCheckin]);

  const showingConfirmation = lookupResult && !lookupResult.checkedInAt;
  const showingSuccess = lookupResult?.checkedInAt;

  const checkedInAtFormatted =
    lookupResult?.checkedInAt && typeof lookupResult.checkedInAt === 'string'
      ? formatInAppTz(lookupResult.checkedInAt, "dd/MM/yyyy '·' HH:mm")
      : null;

  return (
    <AdminProtected>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <UserCheck className="h-7 w-7" />
            {t.admin.checkin.title}
          </h1>
          <p className="text-muted-foreground mt-1">{t.admin.checkin.subtitle}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <QrCode className="h-5 w-5" />
              {lookupResult
                ? t.admin.checkin.confirmFor.replace('{name}', lookupResult.fullName)
                : t.admin.checkin.scanQR}
            </CardTitle>
            <CardDescription>
              {lookupResult
                ? lookupResult.registrationCode
                : t.admin.checkin.scanQRHint}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!lookupResult ? (
              <>
                <QRScanner
                  key={scannerKey}
                  onScan={handleScan}
                  disabled={false}
                  forceCameraLabel={t.admin.checkin.forceCamera}
                />
                <div className="space-y-2">
                  <Label htmlFor="manual-code">{t.admin.checkin.manualCode}</Label>
                  <div className="flex gap-2">
                    <Input
                      id="manual-code"
                      placeholder={t.admin.checkin.codePlaceholder}
                      value={code}
                      onChange={(e) => setCode(e.target.value.toUpperCase())}
                      onKeyDown={(e) => e.key === 'Enter' && doLookup(code)}
                      className="font-mono"
                      disabled={lookupLoading}
                    />
                    <Button
                      type="button"
                      onClick={() => doLookup(code)}
                      disabled={lookupLoading || !code.trim()}
                    >
                      {lookupLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : t.admin.checkin.lookup}
                    </Button>
                  </div>
                </div>
              </>
            ) : showingConfirmation ? (
              <div className="space-y-4 py-2">
                <p className="text-sm text-muted-foreground font-mono">{lookupResult.registrationCode}</p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    onClick={handleConfirmCheckin}
                    disabled={confirmLoading}
                    className="gap-2"
                  >
                    {confirmLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                    {confirmLoading
                      ? t.admin.checkin.confirmCheckin
                      : countdown !== null && countdown > 0
                        ? t.admin.checkin.confirmCheckinCountdown.replace('{n}', String(countdown))
                        : t.admin.checkin.confirmCheckin}
                  </Button>
                  <Button variant="outline" onClick={resetAndScanAgain} disabled={confirmLoading}>
                    {t.admin.checkin.scanAnother}
                  </Button>
                </div>
              </div>
            ) : showingSuccess ? (
              <div className="space-y-4 py-2">
                <div
                  className="rounded-lg border-2 border-red-600 bg-red-50 px-4 py-3 shadow-sm dark:border-red-500 dark:bg-red-950/60"
                  role="status"
                  aria-live="polite"
                >
                  <p className="text-base font-semibold text-red-900 flex items-center gap-2 dark:text-red-50">
                    <CheckCircle2 className="h-5 w-5 text-red-600 shrink-0 dark:text-red-400" aria-hidden />
                    {confirmSuccess
                      ? t.admin.checkin.success.replace('{name}', confirmSuccess)
                      : t.admin.checkin.alreadyCheckedIn}
                  </p>
                  {checkedInAtFormatted ? (
                    <div className="mt-3 flex gap-3 border-t border-red-200 pt-3 dark:border-red-800">
                      <CalendarClock className="h-5 w-5 text-red-700 dark:text-red-300 shrink-0 mt-0.5" aria-hidden />
                      <p className="text-sm font-medium leading-relaxed text-red-800 dark:text-red-100">
                        {t.admin.checkin.checkinRecordedAt.replace('{datetime}', checkedInAtFormatted)}
                      </p>
                    </div>
                  ) : null}
                </div>
                <Button variant="outline" onClick={resetAndScanAgain}>
                  {t.admin.checkin.scanAnother}
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {lookupError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{lookupError}</AlertDescription>
          </Alert>
        )}
      </div>
    </AdminProtected>
  );
}
