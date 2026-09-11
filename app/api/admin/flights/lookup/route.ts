import { NextRequest, NextResponse } from 'next/server';
import { requireRegistrationsAccess } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { FlightLookupError, lookupFlights } from '@/lib/aerodatabox';

export async function GET(request: NextRequest) {
  let staff;
  try {
    staff = await requireRegistrationsAccess(request.headers.get('authorization'));
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const rate = checkRateLimit(`aerodatabox:${staff.uid}`);
  if (!rate.allowed) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }

  const flight = request.nextUrl.searchParams.get('flight')?.trim() ?? '';
  const date = request.nextUrl.searchParams.get('date')?.trim() ?? '';
  if (!flight || !date) {
    return NextResponse.json({ error: 'missing_params' }, { status: 400 });
  }

  try {
    const { flights, debug } = await lookupFlights(flight, date);
    return NextResponse.json({ flights, debug });
  } catch (error) {
    if (error instanceof FlightLookupError) {
      return NextResponse.json(
        { error: error.code, debug: error.debug },
        { status: error.httpStatus }
      );
    }
    console.error('AeroDataBox lookup error:', error);
    return NextResponse.json({ error: 'genericError' }, { status: 500 });
  }
}
