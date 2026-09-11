import { NextRequest, NextResponse } from 'next/server';
import { runFlightSync } from '@/lib/flight-sync';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  const auth = request.headers.get('authorization');
  if (secret) return auth === `Bearer ${secret}`;
  return process.env.NODE_ENV !== 'production';
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const result = await runFlightSync();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Flight sync cron error:', error);
    return NextResponse.json({ error: 'genericError' }, { status: 500 });
  }
}
