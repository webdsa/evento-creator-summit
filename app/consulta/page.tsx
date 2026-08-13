'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLanguage } from '@/lib/i18n';
import { Header } from '@/components/Header';
import { PublicFooter } from '@/components/PublicFooter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, XCircle, AlertCircle, Loader2, Search, QrCode } from 'lucide-react';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';
import type { InstitutionGroup } from '@/lib/db';
import { institutionGroupBannerClassNames } from '@/lib/institution-group-banner';

interface StatusResult {
  status: 'confirmed' | 'canceled';
  fullName: string;
  email: string;
  institutionName: string;
  institutionGroup?: InstitutionGroup;
  registrationCode: string;
  workshopIds?: string[];
}

function ConsultaContent() {
  const searchParams = useSearchParams();
  const { t } = useLanguage();
  const [code, setCode] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<StatusResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const codeFromUrl = searchParams.get('code') ?? searchParams.get('inscricao');
    if (codeFromUrl) setCode(codeFromUrl.trim().toUpperCase());
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);

    const codeTrim = code.trim().toUpperCase();
    const emailTrim = email.trim();

    if (!codeTrim) {
      setError(t.errors.requiredField);
      return;
    }
    if (!emailTrim) {
      setError(t.errors.requiredField);
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrim)) {
      setError(t.errors.invalidEmail);
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({
        code: codeTrim,
        email: emailTrim,
      });
      const res = await fetch(`/api/public/registration/status?${params}`);
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 404) {
          setError(t.checkStatus.notFound);
        } else if (data.error === 'invalidEmail') {
          setError(t.errors.invalidEmail);
        } else if (data.error === 'rateLimitExceeded') {
          setError(t.errors.rateLimitExceeded);
        } else {
          setError(t.errors.genericError);
        }
        return;
      }

      const g = data.institutionGroup;
      const institutionGroup: InstitutionGroup | undefined =
        g === 1 || g === 2 || g === 3 ? g : undefined;
      setResult({
        status: data.status,
        fullName: data.fullName,
        email: data.email,
        institutionName: data.institutionName ?? '',
        institutionGroup,
        registrationCode: data.registrationCode,
        workshopIds: data.workshopIds ?? [],
      });
    } catch {
      setError(t.errors.genericError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="public-area page-consulta min-h-screen min-w-0 overflow-x-hidden flex flex-col">
      <Header />
      <main className="flex-1 flex flex-col justify-center container max-w-2xl mx-auto px-3 sm:px-4 py-6 sm:py-12">
        <div className="text-center mb-6 sm:mb-10">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2 gradient-text-hero px-1">
            {t.checkStatus.title}
          </h1>
          {!result && (
            <p className="text-sm sm:text-base text-white/90 px-1">{t.checkStatus.subtitle}</p>
          )}
        </div>

        {!result && (
          <Card className="glass-card shadow-xl border-2 border-white/30 mb-4 sm:mb-6">
            <CardHeader className="px-4 sm:px-6 pb-2">
              <CardTitle className="flex items-center gap-2 text-xl sm:text-2xl">
                <Search className="h-5 w-5 shrink-0" />
                {t.checkStatus.title}
              </CardTitle>
              <CardDescription className="text-sm sm:text-base">{t.checkStatus.subtitle}</CardDescription>
            </CardHeader>
            <CardContent className="px-4 sm:px-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="code">{t.checkStatus.codeLabel}</Label>
                  <Input
                    id="code"
                    placeholder={t.checkStatus.codePlaceholder}
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    disabled={loading}
                    className="font-mono min-h-[44px]"
                    autoComplete="off"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">{t.checkStatus.emailLabel}</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder={t.checkStatus.emailPlaceholder}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    className="min-h-[44px]"
                    autoComplete="email"
                  />
                </div>
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <Button type="submit" className="btn-primary-cta w-full min-h-[48px]" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t.checkStatus.checkButton}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {result && (
          <Card
            className={
              result.status === 'confirmed'
                ? 'glass-card border-2 border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 shadow-xl'
                : 'glass-card border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 shadow-xl'
            }
          >
            <CardHeader className="pb-4 px-4 sm:px-6">
              <div className="flex items-center gap-3">
                {result.status === 'confirmed' ? (
                  <CheckCircle2 className="h-9 w-9 sm:h-10 sm:w-10 text-green-600 shrink-0" />
                ) : (
                  <XCircle className="h-9 w-9 sm:h-10 sm:w-10 text-amber-600 shrink-0" />
                )}
                <div className="min-w-0">
                  <CardTitle className="text-lg sm:text-xl break-words">
                    {result.status === 'confirmed'
                      ? t.checkStatus.statusConfirmed
                      : t.checkStatus.statusCanceled}
                  </CardTitle>
                  <CardDescription className="font-mono text-sm sm:text-base text-gray-700 break-all">
                    {result.registrationCode}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 px-4 sm:px-6">
              <div>
                <span className="text-sm font-medium text-gray-500">{t.checkStatus.fullName}</span>
                <p className="font-medium text-gray-900 break-words">{result.fullName}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-500">{t.checkStatus.emailLabel}</span>
                <p className="font-medium text-gray-900">{result.email}</p>
              </div>
              {result.institutionName && (
                <div>
                  <span className="text-sm font-medium text-gray-500">
                    {t.checkStatus.institution}
                  </span>
                  <p className="font-medium text-gray-900">{result.institutionName}</p>
                </div>
              )}
              {result.institutionGroup !== undefined && (() => {
                const gn = institutionGroupBannerClassNames(result.institutionGroup);
                const idx = result.institutionGroup - 1;
                const groupTitle = [t.checkStatus.group1, t.checkStatus.group2, t.checkStatus.group3][idx];
                const colorName = [
                  t.checkStatus.groupColorRed,
                  t.checkStatus.groupColorGreen,
                  t.checkStatus.groupColorBlue,
                ][idx];
                return (
                  <div className={gn.box}>
                    <p className={gn.label}>{t.checkStatus.institutionGroup}</p>
                    <p className={gn.value}>{groupTitle}</p>
                    <span className={gn.tag}>{colorName}</span>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        )}

        {result?.status === 'confirmed' && (
          <Card className="glass-card border-2 border-violet-200 bg-gradient-to-br from-violet-50 to-purple-50 shadow-xl mt-4 sm:mt-6">
            <CardHeader className="px-4 sm:px-6 pb-2">
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <QrCode className="h-5 w-5 shrink-0" />
                {t.checkStatus.myQRForCheckin}
              </CardTitle>
              <CardDescription className="text-sm sm:text-base">
                {t.checkStatus.myQRHint}
              </CardDescription>
            </CardHeader>
            <CardContent className="px-4 sm:px-6 flex flex-col items-center pb-6">
              <div className="bg-white p-4 rounded-xl shadow-inner">
                <QRCodeSVG value={result.registrationCode} size={200} level="M" />
              </div>
              <p className="font-mono text-sm text-gray-600 mt-3">{result.registrationCode}</p>
            </CardContent>
          </Card>
        )}

        <p className="text-center mt-6 sm:mt-8 text-sm text-white/90 px-2">
          <Link href="/inscricao" className="text-amber-300 hover:text-white hover:underline">
            Fazer nova inscrição
          </Link>
        </p>
      </main>
      <PublicFooter />
    </div>
  );
}

export default function ConsultaPage() {
  return (
    <Suspense
      fallback={
        <div className="public-area min-h-screen min-w-0 overflow-x-hidden">
          <Header />
          <main className="container max-w-2xl mx-auto px-3 sm:px-4 py-6 sm:py-12 flex justify-center items-center min-h-[50vh]">
            <Loader2 className="h-8 w-8 animate-spin text-white" />
          </main>
        </div>
      }
    >
      <ConsultaContent />
    </Suspense>
  );
}
