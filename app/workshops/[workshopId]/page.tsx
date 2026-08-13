'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useLanguage } from '@/lib/i18n';
import { Header } from '@/components/Header';
import { PublicFooter } from '@/components/PublicFooter';
import { SHOW_WORKSHOPS_PUBLIC } from '@/lib/env-public';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle, BookOpen, ArrowLeft, Users } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

type WorkshopType = 'workshop' | 'plenaria';

interface PublicSpeaker {
  id: string;
  name: string;
  biography: string;
  photo: string;
}

interface WorkshopDetailOccurrence {
  id: string;
  workshopId: string;
  occurrenceIndex: number;
  roomName: string;
}

interface WorkshopDetail {
  workshopId: string;
  type: WorkshopType;
  title: string;
  description: string;
  title_es?: string;
  description_es?: string;
  speakerNames: string;
  speakers: PublicSpeaker[];
  occurrences: WorkshopDetailOccurrence[];
}

function WorkshopDetailContent() {
  const params = useParams();
  const router = useRouter();
  const { t, language } = useLanguage();
  const workshopId = typeof params.workshopId === 'string' ? params.workshopId : '';

  const [workshop, setWorkshop] = useState<WorkshopDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!SHOW_WORKSHOPS_PUBLIC) {
      router.replace('/');
      return;
    }
    if (!workshopId.trim()) {
      setLoading(false);
      setWorkshop(null);
      return;
    }
    setError(null);
    setLoading(true);
    fetch(`/api/public/workshops/${encodeURIComponent(workshopId)}`)
      .then((res) => {
        if (res.status === 404) return null;
        if (!res.ok) throw new Error('Failed to load');
        return res.json();
      })
      .then((data) => {
        if (data?.workshop) setWorkshop(data.workshop);
        else setWorkshop(null);
      })
      .catch(() => setError(t.publicWorkshops.errorLoading))
      .finally(() => setLoading(false));
  }, [workshopId, t.publicWorkshops.errorLoading, router]);

  const displayTitle =
    workshop && (language === 'es' && workshop.title_es ? workshop.title_es : workshop.title);
  const displayDescription =
    workshop &&
    (language === 'es' && workshop.description_es
      ? workshop.description_es
      : workshop.description);

  const notFound = !loading && !error && !workshop;

  if (!SHOW_WORKSHOPS_PUBLIC) {
    return null;
  }

  if (notFound) {
    return (
      <div className="public-area page-workshop-detail min-h-screen min-w-0 overflow-x-hidden flex flex-col">
        <Header />
        <main className="flex-1 flex flex-col justify-center container max-w-2xl mx-auto px-3 sm:px-4 py-6 sm:py-12">
          <Card className="bg-white/15 backdrop-blur-md border-2 border-dashed border-white/30">
            <CardContent className="py-12 text-center">
              <p className="text-white/90 mb-4">{t.errors.notFound}</p>
              <Button variant="outline" asChild className="border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white">
                <Link href="/workshops">{t.publicWorkshops.backToWorkshops}</Link>
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="public-area page-workshop-detail min-h-screen min-w-0 overflow-x-hidden flex flex-col">
      <Header />
      <main className="flex-1 flex flex-col justify-center container max-w-3xl mx-auto px-3 sm:px-4 py-6 sm:py-12">
        <div className="mb-6">
          <Button
            variant="outline"
            size="sm"
            asChild
            className="gap-1 -ml-2 border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white"
          >
            <Link href="/workshops">
              <ArrowLeft className="h-4 w-4" />
              {t.publicWorkshops.backToWorkshops}
            </Link>
          </Button>
        </div>

        {loading && (
          <div className="flex justify-center py-16">
            <Loader2 className="h-10 w-10 animate-spin text-white" />
          </div>
        )}

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!loading && !error && workshop && (
          <div className="space-y-8 animate-fade-in">
            <Card className="bg-white/15 backdrop-blur-md border border-white/30 shadow-lg overflow-hidden">
              <CardHeader className="pb-4 sm:pb-5">
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <Badge
                    className={
                      workshop.type === 'plenaria'
                        ? 'border-transparent bg-red-500 text-white hover:bg-red-600'
                        : 'border-transparent bg-blue-500 text-white hover:bg-blue-600'
                    }
                  >
                    {workshop.type === 'plenaria'
                      ? t.publicWorkshops.typePlenaria
                      : t.publicWorkshops.typeWorkshop}
                  </Badge>
                </div>
                <CardTitle className="text-2xl sm:text-3xl flex items-start gap-3 leading-tight text-white">
                  <BookOpen className="h-7 w-7 sm:h-8 sm:w-8 text-violet-300 shrink-0 mt-0.5" />
                  <span className="break-words">{displayTitle}</span>
                </CardTitle>
                {workshop.speakerNames && (
                  <CardDescription className="text-base sm:text-lg flex items-center gap-2 mt-3 text-white/90">
                    <Users className="h-4 w-4 shrink-0" />
                    {t.publicWorkshops.speakers}: {workshop.speakerNames}
                  </CardDescription>
                )}
              </CardHeader>
              {displayDescription && (
                <CardContent className="pt-0 pb-6 sm:pb-8">
                  <div className="rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 p-5 sm:p-6">
                    <p className="text-white/90 text-base sm:text-lg leading-relaxed whitespace-pre-wrap break-words max-w-none">
                      {displayDescription}
                    </p>
                  </div>
                </CardContent>
              )}
            </Card>

            {workshop.speakers && workshop.speakers.length > 0 && (
              <Card className="bg-white/15 backdrop-blur-md border border-white/30 shadow-lg">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg sm:text-xl flex items-center gap-2 text-white">
                    <Users className="h-5 w-5 text-violet-300" />
                    {t.publicWorkshops.speakers}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {workshop.speakers.map((speaker) => (
                    <div
                      key={speaker.id}
                      className="flex flex-col sm:flex-row gap-4 p-4 sm:p-5 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20"
                    >
                      <div className="w-full sm:w-36 shrink-0 rounded-xl border-2 border-white/30 shadow-md overflow-hidden [aspect-ratio:1/1]">
                        <Avatar className="h-full w-full rounded-xl">
                          <AvatarImage src={speaker.photo} alt={speaker.name} className="object-cover h-full w-full" />
                          <AvatarFallback className="rounded-xl bg-violet-500/30 text-violet-200 text-xl font-semibold h-full w-full">
                            {speaker.name
                              .split(/\s+/)
                              .map((s) => s[0])
                              .join('')
                              .slice(0, 2)
                              .toUpperCase() || '?'}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-semibold text-white text-xl mb-1">{speaker.name}</h4>
                        {speaker.biography && (
                          <p className="text-white/90 text-sm sm:text-base leading-relaxed whitespace-pre-wrap">
                            {speaker.biography}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            <div className="flex flex-col sm:flex-row justify-center gap-3 pt-4 pb-2">
              <Button
                asChild
                variant="outline"
                size="lg"
                className="shadow-sm border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white"
              >
                <Link href="/workshops">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  {t.publicWorkshops.backToWorkshops}
                </Link>
              </Button>
              <Button asChild size="lg" className="btn-primary-cta shadow-md">
                <Link href="/inscricao">{t.header.navInscription}</Link>
              </Button>
            </div>
          </div>
        )}
      </main>
      <PublicFooter />
    </div>
  );
}

export default function WorkshopDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="public-area min-h-screen min-w-0 overflow-x-hidden">
          <Header />
          <main className="container max-w-3xl mx-auto px-3 sm:px-4 py-6 sm:py-12 flex justify-center items-center min-h-[50vh]">
            <Loader2 className="h-8 w-8 animate-spin text-white" />
          </main>
        </div>
      }
    >
      <WorkshopDetailContent />
    </Suspense>
  );
}
