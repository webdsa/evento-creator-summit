import { NextRequest, NextResponse } from 'next/server';
import { requireFlightsAccess } from '@/lib/auth';
import { listRegistrations, listRegistrationsByInstitution } from '@/lib/db';

export async function GET(request: NextRequest) {
  let staff;
  try {
    const authHeader = request.headers.get('authorization');
    staff = await requireFlightsAccess(authHeader);
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  try {
    const list = staff.institutionId
      ? await listRegistrationsByInstitution(staff.institutionId)
      : await listRegistrations();
    return NextResponse.json(list);
  } catch (error) {
    console.error('List registrations error:', error);
    return NextResponse.json({ error: 'genericError' }, { status: 500 });
  }
}
