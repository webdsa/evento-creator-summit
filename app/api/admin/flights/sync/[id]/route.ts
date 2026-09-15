import { NextRequest, NextResponse } from 'next/server';
import { canAccessRegistration, requireFlightsAccess } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { getRegistrationById } from '@/lib/db';
import { syncRegistrationFlight } from '@/lib/flight-sync';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let staff;
  try {
    staff = await requireFlightsAccess(request.headers.get('authorization'));
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const rate = checkRateLimit(`aerodatabox:${staff.uid}`);
  if (!rate.allowed) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }

  const { id } = await params;
  if (!id?.trim()) {
    return NextResponse.json({ error: 'missing_id' }, { status: 400 });
  }

  try {
    const registration = await getRegistrationById(id.trim());
    if (!registration || !canAccessRegistration(staff, registration.institution_id)) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    const result = await syncRegistrationFlight(id.trim());
    if (!result.ok) {
      const status = result.reason === 'not_found' ? 404 : 400;
      return NextResponse.json({ error: result.reason }, { status });
    }
    return NextResponse.json(result);
  } catch (error) {
    console.error('Single flight sync error:', error);
    return NextResponse.json({ error: 'genericError' }, { status: 500 });
  }
}
