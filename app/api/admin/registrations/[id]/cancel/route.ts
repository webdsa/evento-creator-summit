import { NextRequest, NextResponse } from 'next/server';
import { canAccessRegistration, requireRegistrationsAccess } from '@/lib/auth';
import { cancelRegistration, getRegistrationById } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let staff;
  try {
    const authHeader = request.headers.get('authorization');
    staff = await requireRegistrationsAccess(authHeader);
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  try {
    const { id } = await params;
    if (!id || typeof id !== 'string' || id.length > 1500) {
      return NextResponse.json({ error: 'invalidRequest' }, { status: 400 });
    }
    const registration = await getRegistrationById(id);
    if (!registration || !canAccessRegistration(staff, registration.institution_id)) {
      return NextResponse.json({ error: 'notFound' }, { status: 404 });
    }
    const result = await cancelRegistration(id, staff.uid);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: result.error === 'REGISTRATION_NOT_FOUND' ? 404 : 400 }
      );
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Cancel registration error:', error);
    return NextResponse.json({ error: 'genericError' }, { status: 500 });
  }
}
