import { NextRequest, NextResponse } from 'next/server';
import { getWorkshop, getSpeakersByIds, getRoom } from '@/lib/db';
import { checkRateLimit, getRateLimitIdentifier } from '@/lib/rate-limit';
import type { WorkshopType } from '@/lib/db';

export interface PublicSpeaker {
  id: string;
  name: string;
  biography: string;
  photo: string;
}

export interface WorkshopDetailOccurrence {
  id: string;
  workshopId: string;
  occurrenceIndex: number;
  roomName: string;
}

/** GET: detalhes de um workshop/plenária por id, com palestrantes e sessões. */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ workshopId: string }> }
) {
  const { workshopId } = await params;
  const identifier = getRateLimitIdentifier(_request);
  const rateLimit = checkRateLimit(identifier);
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'rateLimitExceeded' }, { status: 429 });
  }

  if (!workshopId?.trim()) {
    return NextResponse.json({ error: 'notFound' }, { status: 404 });
  }

  try {
    const workshop = await getWorkshop(workshopId.trim());
    if (!workshop) {
      return NextResponse.json({ error: 'notFound' }, { status: 404 });
    }

    const [speakers, ...roomResults] = await Promise.all([
      getSpeakersByIds(workshop.speaker_ids),
      ...(workshop.occurrences ?? [
        { room_id: workshop.room_id },
        { room_id: workshop.room_id },
        { room_id: workshop.room_id },
      ])
        .slice(0, 3)
        .map((o) => getRoom(o?.room_id ?? workshop.room_id)),
    ]);

    const speakerNames = speakers.map((s) => s.name).filter(Boolean).join(', ');
    const occurrences: WorkshopDetailOccurrence[] = (
      workshop.occurrences ?? [
        { room_id: workshop.room_id },
        { room_id: workshop.room_id },
        { room_id: workshop.room_id },
      ]
    )
      .slice(0, 3)
      .map((o, idx) => ({
        id: `${workshop.id}:${idx}`,
        workshopId: workshop.id,
        occurrenceIndex: idx,
        roomName: roomResults[idx]?.name ?? '',
      }));

    const publicSpeakers: PublicSpeaker[] = speakers.map((s) => ({
      id: s.id,
      name: s.name,
      biography: s.biography ?? '',
      photo: s.photo ?? '',
    }));

    return NextResponse.json({
      workshop: {
        workshopId: workshop.id,
        type: (workshop.type === 'plenaria' ? 'plenaria' : 'workshop') as WorkshopType,
        title: workshop.title,
        description: workshop.description,
        title_es: workshop.title_es,
        description_es: workshop.description_es,
        speakerNames,
        speakers: publicSpeakers,
        occurrences,
      },
    });
  } catch (error) {
    console.error('Workshop detail error:', error);
    return NextResponse.json({ error: 'genericError' }, { status: 500 });
  }
}
