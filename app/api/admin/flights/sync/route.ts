import { NextRequest, NextResponse } from 'next/server';
import { requireRegistrationsAccess } from '@/lib/auth';
import { getFlightSyncStatus, runFlightSync } from '@/lib/flight-sync';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function GET(request: NextRequest) {
  try {
    await requireRegistrationsAccess(request.headers.get('authorization'));
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const meta = await getFlightSyncStatus();
  return NextResponse.json(meta);
}

export async function POST(request: NextRequest) {
  try {
    await requireRegistrationsAccess(request.headers.get('authorization'));
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const force = request.nextUrl.searchParams.get('force') === '1';
  try {
    const result = await runFlightSync({ force });
    return NextResponse.json(result);
  } catch (error) {
    console.error('Flight sync error:', error);
    return NextResponse.json({ error: 'genericError' }, { status: 500 });
  }
}
