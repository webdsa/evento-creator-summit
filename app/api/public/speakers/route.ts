import { listSpeakers } from '@/lib/db';
import { checkRateLimit, getRateLimitIdentifier } from '@/lib/rate-limit';
import { NextRequest } from 'next/server';

/** GET: lista palestrantes para a landing page (nome, biografia, foto). */
export async function GET(request: NextRequest) {
  const identifier = getRateLimitIdentifier(request);
  const rateLimit = checkRateLimit(identifier);

  if (!rateLimit.allowed) {
    return Response.json({ error: 'rateLimitExceeded' }, { status: 429 });
  }

  try {
    const list = await listSpeakers();
    return Response.json({
      speakers: list.map((s) => ({
        id: s.id,
        name: s.name,
        biography: s.biography ?? '',
        photo: s.photo ?? '',
      })),
    });
  } catch (error) {
    console.error('List speakers error:', error);
    return Response.json({ error: 'genericError' }, { status: 500 });
  }
}
