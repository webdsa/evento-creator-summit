'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import type { CarouselApi } from '@/components/ui/carousel';
import { Loader2, AlertCircle, BookOpen, User, ChevronRight } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { PublicFooter } from '@/components/PublicFooter';
import { SHOW_WORKSHOPS_PUBLIC } from '@/lib/env-public';

const AUTOPLAY_DELAY_MS = 4000;

interface PublicSpeaker {
  id: string;
  name: string;
  biography: string;
  photo: string;
}

interface WorkshopOccurrence {
  id: string;
  workshopId: string;
  occurrenceIndex: number;
  type?: 'workshop' | 'plenaria';
  title: string;
  description: string;
  title_es?: string;
  description_es?: string;
  speakerNames?: string;
  roomName: string;
}

const DAY_INDEXES = [0, 1, 2] as const; // 0 = 16/04, 1 = 17/04, 2 = 18/04

export function LandingContent() {
  const { t, language } = useLanguage();
  const [speakers, setSpeakers] = useState<PublicSpeaker[]>([]);
  const [workshops, setWorkshops] = useState<WorkshopOccurrence[]>([]);
  const [loadingSpeakers, setLoadingSpeakers] = useState(true);
  const [loadingProgram, setLoadingProgram] = useState(true);
  const [errorSpeakers, setErrorSpeakers] = useState<string | null>(null);
  const [errorProgram, setErrorProgram] = useState<string | null>(null);
  const [speakersApi, setSpeakersApi] = useState<CarouselApi | null>(null);

  useEffect(() => {
    fetch('/api/public/speakers')
      .then((res) => res.json())
      .then((data) => {
        if (data.speakers) setSpeakers(data.speakers);
        else setSpeakers([]);
      })
      .catch(() => setErrorSpeakers(t.landing.errorLoading))
      .finally(() => setLoadingSpeakers(false));
  }, [t.landing.errorLoading]);

  useEffect(() => {
    if (!SHOW_WORKSHOPS_PUBLIC) {
      setLoadingProgram(false);
      return;
    }
    fetch('/api/public/workshops?listing=1')
      .then((res) => res.json())
      .then((data) => {
        if (data.workshops) setWorkshops(data.workshops);
        else setWorkshops([]);
      })
      .catch(() => setErrorProgram(t.landing.errorLoading))
      .finally(() => setLoadingProgram(false));
  }, [t.landing.errorLoading]);

  const programByDay = useMemo(() => {
    const byDay: Record<number, WorkshopOccurrence[]> = { 0: [], 1: [], 2: [] };
    const useEs = language === 'es';
    for (const w of workshops) {
      const idx = w.occurrenceIndex;
      if (idx in byDay) {
        byDay[idx].push({
          ...w,
          title: useEs && w.title_es ? w.title_es : w.title,
          description: useEs && w.description_es ? w.description_es : w.description,
        });
      }
    }
    return byDay;
  }, [workshops, language]);

  // Autoplay do carrossel de palestrantes
  useEffect(() => {
    if (!speakersApi || speakers.length <= 1) return;
    const interval = setInterval(() => {
      speakersApi.scrollNext();
    }, AUTOPLAY_DELAY_MS);
    return () => clearInterval(interval);
  }, [speakersApi, speakers.length]);

  return (
    <>
      <main className="min-w-0 flex-1">
      {/* Hero */}
      <section className="relative px-3 sm:px-4 py-16 sm:py-24 md:py-32 text-center overflow-hidden">
        <div className="container max-w-4xl mx-auto">
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-4 sm:mb-6 gradient-text-hero animate-fade-in">
            {t.landing.heroTitle}
          </h1>
          <p className="text-lg sm:text-xl text-white/90 max-w-2xl mx-auto mb-8 sm:mb-10 animate-fade-in">
            {t.landing.heroSubtitle}
          </p>
          <Link href="/inscricao">
            <Button size="lg" className="btn-primary-cta text-base sm:text-lg px-8 py-6 rounded-xl shadow-xl animate-fade-in">
              {t.landing.heroCta}
            </Button>
          </Link>
        </div>
      </section>

      {/* Conteúdo extra da landing oculto – exibir apenas hero */}
      {false && (
        <>
      {/* Palestrantes - carrossel full width com autoplay */}
      <section id="palestrantes" className="w-full py-12 sm:py-16 scroll-mt-20 overflow-hidden">
        <div className="container max-w-6xl mx-auto px-3 sm:px-4 mb-8">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-2 gradient-text-hero">
            {t.landing.speakersTitle}
          </h2>
          <p className="text-center text-white/90 text-base sm:text-lg max-w-2xl mx-auto">
            {t.landing.speakersSubtitle}
          </p>
        </div>

        {errorSpeakers && (
          <div className="container max-w-6xl mx-auto px-3 sm:px-4 mb-6">
            <Alert variant="destructive" className="border-white/20 bg-red-900/30">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errorSpeakers}</AlertDescription>
            </Alert>
          </div>
        )}

        {loadingSpeakers && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-10 w-10 animate-spin text-white" />
          </div>
        )}

        {!loadingSpeakers && !errorSpeakers && speakers.length === 0 && (
          <p className="text-center text-white/80 py-8">{t.landing.noSpeakers}</p>
        )}

        {!loadingSpeakers && !errorSpeakers && speakers.length > 0 && (
          <div className="w-full relative">
            <Carousel
              setApi={setSpeakersApi}
              opts={{ align: 'start', loop: true }}
              className="w-full"
            >
              <CarouselContent className="-ml-0">
                {speakers.map((s) => (
                  <CarouselItem
                    key={s.id}
                    className="pl-0 basis-[min(200px,50vw)] sm:basis-[min(220px,33.333vw)] md:basis-[min(260px,25vw)]"
                  >
                    <Card className="bg-white/15 backdrop-blur-md border border-white/30 overflow-hidden mx-1 sm:mx-1.5 shadow-lg">
                      <div className="aspect-square relative bg-gradient-to-br from-violet-600/20 to-fuchsia-600/20 flex items-center justify-center overflow-hidden">
                        {s.photo ? (
                          <img
                            src={s.photo}
                            alt={s.name}
                            className="absolute inset-0 w-full h-full object-cover object-center"
                          />
                        ) : (
                          <User className="h-20 w-20 text-white/50" />
                        )}
                      </div>
                      <CardContent className="p-3 text-center bg-white/10 backdrop-blur-sm">
                        <h3 className="font-semibold text-sm sm:text-base text-white truncate drop-shadow-md">
                          {s.name}
                        </h3>
                      </CardContent>
                    </Card>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="left-2 sm:left-4 border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white disabled:opacity-30" />
              <CarouselNext className="right-2 sm:right-4 border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white disabled:opacity-30" />
            </Carousel>
          </div>
        )}
      </section>

      {/* Programa (oculto quando NEXT_PUBLIC_SHOW_WORKSHOPS=false) */}
      {SHOW_WORKSHOPS_PUBLIC && (
        <section id="programa" className="px-3 sm:px-4 py-12 sm:py-16 scroll-mt-20">
          <div className="container max-w-4xl mx-auto">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-2 gradient-text-hero">
              {t.landing.programTitle}
            </h2>
            <p className="text-center text-white/90 text-base sm:text-lg mb-8 max-w-2xl mx-auto">
              {t.landing.programSubtitle}
            </p>

            {errorProgram && (
              <Alert variant="destructive" className="mb-6 border-white/20 bg-red-900/30">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{errorProgram}</AlertDescription>
              </Alert>
            )}

            {loadingProgram && (
              <div className="flex justify-center py-12">
                <Loader2 className="h-10 w-10 animate-spin text-white" />
              </div>
            )}

            {!loadingProgram && !errorProgram && (
              <Tabs defaultValue="0" className="w-full">
                <TabsList className="grid w-full grid-cols-3 h-auto p-1 bg-white/10 border border-white/20 rounded-xl mb-6">
                  <TabsTrigger
                    value="0"
                    className="data-[state=active]:bg-white/20 data-[state=active]:text-white rounded-lg py-2.5 text-sm sm:text-base"
                  >
                    {t.landing.day16}
                  </TabsTrigger>
                  <TabsTrigger
                    value="1"
                    className="data-[state=active]:bg-white/20 data-[state=active]:text-white rounded-lg py-2.5 text-sm sm:text-base"
                  >
                    {t.landing.day17}
                  </TabsTrigger>
                  <TabsTrigger
                    value="2"
                    className="data-[state=active]:bg-white/20 data-[state=active]:text-white rounded-lg py-2.5 text-sm sm:text-base"
                  >
                    {t.landing.day18}
                  </TabsTrigger>
                </TabsList>
                {DAY_INDEXES.map((dayIdx) => (
                  <TabsContent key={dayIdx} value={String(dayIdx)} className="mt-0">
                    <div className="space-y-4">
                      {programByDay[dayIdx]?.length === 0 ? (
                        <p className="text-center text-white/80 py-8">
                          {t.landing.noProgram}
                        </p>
                      ) : (
                        programByDay[dayIdx]?.map((w) => (
                          <Card
                            key={w.id}
                            className="bg-white/15 backdrop-blur-md border border-white/30 overflow-hidden shadow-lg"
                          >
                            <CardContent className="p-4 sm:p-5">
                              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-2 mb-1">
                                    <Badge
                                      className={
                                        w.type === 'plenaria'
                                          ? 'bg-red-500 text-white border-0'
                                          : 'bg-blue-500 text-white border-0'
                                      }
                                    >
                                      {w.type === 'plenaria'
                                        ? t.publicWorkshops.typePlenaria
                                        : t.publicWorkshops.typeWorkshop}
                                    </Badge>
                                    {w.roomName && (
                                      <span className="text-xs text-white/80">
                                        {t.publicWorkshops.room}: {w.roomName}
                                      </span>
                                    )}
                                  </div>
                                  <h3 className="font-semibold text-lg text-white flex items-center gap-2">
                                    <BookOpen className="h-5 w-5 text-violet-300 shrink-0" />
                                    {w.title}
                                  </h3>
                                  {w.speakerNames && (
                                    <p className="text-sm text-white/90 mt-1">
                                      {t.publicWorkshops.speakers}: {w.speakerNames}
                                    </p>
                                  )}
                                  {w.description && (
                                    <p className="text-sm text-white/80 mt-2 line-clamp-2">
                                      {w.description}
                                    </p>
                                  )}
                                </div>
                                <Link
                                  href={`/workshops/${w.workshopId}`}
                                  className="shrink-0 self-start sm:self-center"
                                >
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="gap-1.5 border-white/30 bg-white/10 text-white hover:bg-white/20"
                                  >
                                    {t.publicWorkshops.seeDetails}
                                    <ChevronRight className="h-4 w-4" />
                                  </Button>
                                </Link>
                              </div>
                            </CardContent>
                          </Card>
                        ))
                      )}
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            )}
          </div>
        </section>
      )}

      {/* Formulário de inscrição (CTA) */}
      <section id="inscricao" className="px-3 sm:px-4 py-12 sm:py-20 scroll-mt-20">
        <div className="container max-w-2xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 gradient-text-hero">
            {t.landing.inscriptionTitle}
          </h2>
          <p className="text-white/90 text-base sm:text-lg mb-8">
            {t.landing.inscriptionSubtitle}
          </p>
          <Link href="/inscricao">
            <Button size="lg" className="btn-primary-cta text-base px-8 py-6 rounded-xl shadow-xl">
              {t.landing.inscriptionCta}
            </Button>
          </Link>
        </div>
      </section>
        </>
      )}

      </main>
      <PublicFooter />
    </>
  );
}
