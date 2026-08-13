'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/lib/i18n';
import { Header } from '@/components/Header';
import { PublicFooter } from '@/components/PublicFooter';
import { SHOW_WORKSHOPS_PUBLIC } from '@/lib/env-public';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle, BookOpen, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';

type WorkshopType = 'workshop' | 'plenaria';

interface WorkshopOccurrence {
  workshopId: string;
  occurrenceIndex: number;
  type?: WorkshopType;
  title: string;
  description: string;
  title_es?: string;
  description_es?: string;
  speakerNames?: string;
}

interface WorkshopListItem {
  workshopId: string;
  type: WorkshopType;
  title: string;
  description: string;
  title_es?: string;
  description_es?: string;
  speakerNames: string;
}

function groupByWorkshop(
  items: WorkshopOccurrence[],
  language: 'pt-BR' | 'es'
): WorkshopListItem[] {
  const map = new Map<string, WorkshopOccurrence[]>();
  for (const w of items) {
    const list = map.get(w.workshopId) ?? [];
    list.push(w);
    map.set(w.workshopId, list);
  }
  const useEs = language === 'es';
  return Array.from(map.entries()).map(([, occurrences]) => {
    const first = occurrences.sort((a, b) => a.occurrenceIndex - b.occurrenceIndex)[0];
    return {
      workshopId: first.workshopId,
      type: (first.type === 'plenaria' ? 'plenaria' : 'workshop') as WorkshopType,
      title: useEs && first.title_es ? first.title_es : first.title,
      description: useEs && first.description_es ? first.description_es : first.description,
      title_es: first.title_es,
      description_es: first.description_es,
      speakerNames: first.speakerNames ?? '',
    };
  });
}

function WorkshopsContent() {
  const { t, language } = useLanguage();
  const router = useRouter();
  const [list, setList] = useState<WorkshopOccurrence[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!SHOW_WORKSHOPS_PUBLIC) {
      router.replace('/');
      return;
    }
    setError(null);
    fetch('/api/public/workshops?listing=1')
      .then((res) => res.json())
      .then((data) => {
        if (data.workshops) setList(data.workshops);
        else setList([]);
      })
      .catch(() => setError(t.publicWorkshops.errorLoading))
      .finally(() => setLoading(false));
  }, [t.publicWorkshops.errorLoading, router]);

  const grouped = useMemo(() => {
    const items = groupByWorkshop(list, language);
    const getTitle = (w: WorkshopListItem) =>
      (language === 'es' && w.title_es ? w.title_es : w.title).trim().toLowerCase();
    return [...items].sort((a, b) => getTitle(a).localeCompare(getTitle(b)));
  }, [list, language]);

  const displayTitle = (w: WorkshopListItem) =>
    language === 'es' && w.title_es ? w.title_es : w.title;
  const displayDescription = (w: WorkshopListItem) =>
    language === 'es' && w.description_es ? w.description_es : w.description;

  if (!SHOW_WORKSHOPS_PUBLIC) {
    return null;
  }

  return (
    <div className="public-area page-workshops min-h-screen min-w-0 overflow-x-hidden flex flex-col">
      <Header />
      <main className="flex-1 flex flex-col justify-center container max-w-4xl mx-auto px-3 sm:px-4 py-6 sm:py-12">
        <div className="text-center mb-8 sm:mb-12 animate-fade-in">
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-4 gradient-text-hero px-1">
            {t.publicWorkshops.title}
          </h1>
          <p className="text-base sm:text-lg text-white/90 max-w-2xl mx-auto px-1">
            {t.publicWorkshops.subtitle}
          </p>
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

        {!loading && !error && grouped.length === 0 && (
          <Card className="bg-white/15 backdrop-blur-md">
            <CardContent className="py-12 text-center text-white/90">
              {t.publicWorkshops.noWorkshops}
            </CardContent>
          </Card>
        )}

        {!loading && !error && grouped.length > 0 && (
          <div className="space-y-10">
            {grouped.map((workshop) => (
              <Card
                key={workshop.workshopId}
                className="bg-white/15 backdrop-blur-md shadow-lg hover:shadow-xl hover:border-white/50 transition-all duration-200 overflow-hidden"
              >
                <CardHeader className="pb-3 sm:pb-4">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
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
                      <CardTitle className="text-xl sm:text-2xl break-words flex items-start gap-2 leading-tight text-white">
                        <BookOpen className="h-5 w-5 sm:h-6 sm:w-6 text-violet-300 shrink-0 mt-0.5" />
                        {displayTitle(workshop)}
                      </CardTitle>
                      {workshop.speakerNames && (
                        <CardDescription className="text-sm sm:text-base text-white/90">
                          {t.publicWorkshops.speakers}: {workshop.speakerNames}
                        </CardDescription>
                      )}
                    </div>
                    <Link href={`/workshops/${workshop.workshopId}`} className="shrink-0 self-start sm:self-center">
                      <Button variant="outline" size="sm" className="gap-1.5 border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white">
                        {t.publicWorkshops.seeDetails}
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                {displayDescription(workshop) && (
                  <CardContent className="pt-0 pb-4">
                    <div className="rounded-lg bg-white/10 backdrop-blur-sm p-4 sm:p-5">
                      <p className="text-sm sm:text-base text-white/90 leading-relaxed whitespace-pre-wrap break-words">
                        {displayDescription(workshop)}
                      </p>
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}
      </main>
      <PublicFooter />
    </div>
  );
}

export default function WorkshopsPage() {
  return (
    <Suspense
      fallback={
        <div className="public-area min-h-screen min-w-0 overflow-x-hidden">
          <Header />
          <main className="container max-w-4xl mx-auto px-3 sm:px-4 py-6 sm:py-12 flex justify-center items-center min-h-[50vh]">
            <Loader2 className="h-8 w-8 animate-spin text-white" />
          </main>
        </div>
      }
    >
      <WorkshopsContent />
    </Suspense>
  );
}
