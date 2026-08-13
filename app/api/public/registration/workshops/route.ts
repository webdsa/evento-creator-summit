import { NextRequest, NextResponse } from 'next/server';
import {
  getRegistrationByCodeAndEmail,
  updateRegistration,
  getWorkshop,
  getWorkshopOccurrenceEnrollmentCount,
  getRoom,
} from '@/lib/db';
import { checkRateLimit, getRateLimitIdentifier } from '@/lib/rate-limit';

const MAX_WORKSHOPS = 3;
const OCCURRENCE_KEY_REGEX = /^([^:]+):([0-2])$/;

/** PATCH: atualiza os workshops do inscrito (autenticado por código + e-mail). workshopIds = chaves "workshopId:0|1|2". */
export async function PATCH(request: NextRequest) {
  const identifier = getRateLimitIdentifier(request);
  const rateLimit = checkRateLimit(identifier);

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'rateLimitExceeded' },
      { status: 429 }
    );
  }

  let body: { code?: string; email?: string; workshopIds?: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'missingFields' },
      { status: 400 }
    );
  }

  const code = typeof body.code === 'string' ? body.code.trim().toUpperCase() : '';
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const rawIds = Array.isArray(body.workshopIds) ? body.workshopIds : [];

  if (!code || !email) {
    return NextResponse.json(
      { error: 'missingFields' },
      { status: 400 }
    );
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return NextResponse.json(
      { error: 'invalidEmail' },
      { status: 400 }
    );
  }

  const occurrenceKeys = [...new Set(rawIds.filter((id): id is string => typeof id === 'string' && id.trim().length > 0))].slice(0, MAX_WORKSHOPS);
  const workshopIdsSeen = new Set<string>();
  for (const key of occurrenceKeys) {
    const m = key.match(OCCURRENCE_KEY_REGEX);
    if (!m) {
      return NextResponse.json(
        { error: 'invalidOccurrenceKey', key },
        { status: 400 }
      );
    }
    const workshopId = m[1];
    if (workshopIdsSeen.has(workshopId)) {
      return NextResponse.json(
        { error: 'sameWorkshopTwice', workshopId },
        { status: 400 }
      );
    }
    workshopIdsSeen.add(workshopId);
  }

  try {
    const registration = await getRegistrationByCodeAndEmail(code, email);

    if (!registration) {
      return NextResponse.json(
        { error: 'notFound' },
        { status: 404 }
      );
    }

    if (registration.status !== 'confirmed') {
      return NextResponse.json(
        { error: 'registrationCanceled' },
        { status: 400 }
      );
    }

    const currentKeys = registration.workshop_occurrence_keys ?? [];

    for (const occurrenceKey of occurrenceKeys) {
      const m = occurrenceKey.match(OCCURRENCE_KEY_REGEX)!;
      const workshopId = m[1];
      const occurrenceIndex = parseInt(m[2], 10);
      const workshop = await getWorkshop(workshopId);
      if (!workshop) {
        return NextResponse.json(
          { error: 'workshopNotFound', workshopId },
          { status: 400 }
        );
      }
      const occs = workshop.occurrences ?? [
        { room_id: workshop.room_id },
        { room_id: workshop.room_id },
        { room_id: workshop.room_id },
      ];
      const roomId = occs[occurrenceIndex]?.room_id ?? workshop.room_id;
      const room = roomId ? await getRoom(roomId) : null;
      const capacity = room?.capacity ?? 0;
      const enrolledCount = await getWorkshopOccurrenceEnrollmentCount(occurrenceKey);
      const wasEnrolled = currentKeys.includes(occurrenceKey);
      const effectiveCount = wasEnrolled ? enrolledCount - 1 : enrolledCount;
      const vagasDisponiveis = Math.max(0, capacity - effectiveCount);

      if (vagasDisponiveis <= 0) {
        return NextResponse.json(
          { error: 'workshopFull', workshopId, title: workshop.title },
          { status: 400 }
        );
      }
    }

    await updateRegistration(registration.id, { workshop_occurrence_keys: occurrenceKeys });

    return NextResponse.json({
      success: true,
      workshopIds: occurrenceKeys,
    });
  } catch (error) {
    console.error('Update registration workshops error:', error);
    return NextResponse.json(
      { error: 'genericError' },
      { status: 500 }
    );
  }
}
