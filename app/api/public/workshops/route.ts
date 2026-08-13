import { NextResponse } from 'next/server';
import {
  listWorkshopsWithVagas,
  listWorkshopsForListing,
  listWorkshops,
  getSpeakersByIds,
} from '@/lib/db';
import { checkRateLimit, getRateLimitIdentifier } from '@/lib/rate-limit';
import { NextRequest } from 'next/server';

/** GET: lista workshops (e plenárias quando ?listing=1).
 *  Sem listing: apenas workshops, com vagas (para consulta/inscrição).
 *  Com listing=1: todos (workshops + plenárias) para listagem/detalhe, sem consultas de vagas (mais rápido).
 *  Com listing=1&withSpeakers=1: um item por workshop com array de palestrantes (id, name, biography, photo). */
export async function GET(request: NextRequest) {
  const identifier = getRateLimitIdentifier(request);
  const rateLimit = checkRateLimit(identifier);

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'rateLimitExceeded' },
      { status: 429 }
    );
  }

  const forListing = request.nextUrl.searchParams.get('listing') === '1';
  const withSpeakers = request.nextUrl.searchParams.get('withSpeakers') === '1';

  try {
    if (forListing && withSpeakers) {
      const list = await listWorkshops();
      const uniqueSpeakerIds = [...new Set(list.flatMap((w) => w.speaker_ids).filter(Boolean))];
      const speakersList = await getSpeakersByIds(uniqueSpeakerIds);
      const speakerMap = new Map(speakersList.map((s) => [s.id, s]));
      return NextResponse.json({
        workshops: list.map((w) => ({
          workshopId: w.id,
          type: w.type,
          title: w.title,
          description: w.description,
          title_es: w.title_es,
          description_es: w.description_es,
          speakerNames: w.speaker_ids.map((id) => speakerMap.get(id)?.name ?? id).join(', ') || '',
          speakers: w.speaker_ids
            .map((id) => speakerMap.get(id))
            .filter(Boolean)
            .map((s) => ({
              id: s!.id,
              name: s!.name,
              biography: s!.biography ?? '',
              photo: s!.photo ?? '',
            })),
        })),
      });
    }

    const list = forListing
      ? await listWorkshopsForListing()
      : await listWorkshopsWithVagas(true);
    return NextResponse.json({
      workshops: list.map((w) => ({
        id: w.occurrenceKey,
        workshopId: w.id,
        occurrenceIndex: w.occurrenceIndex,
        type: w.type,
        title: w.title,
        description: w.description,
        title_es: w.title_es,
        description_es: w.description_es,
        speakerNames: w.speaker_names ?? '',
        roomName: w.room_name,
        capacity: w.capacity,
        enrolledCount: w.enrolledCount,
        vagasDisponiveis: w.vagasDisponiveis,
      })),
    });
  } catch (error) {
    console.error('List workshops error:', error);
    return NextResponse.json(
      { error: 'genericError' },
      { status: 500 }
    );
  }
}
