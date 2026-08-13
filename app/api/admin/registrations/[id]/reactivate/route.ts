import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { reactivateRegistration } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization');
    await requireAdmin(authHeader);
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  try {
    const { id } = await params;
    if (!id || typeof id !== 'string' || id.length > 1500) {
      return NextResponse.json({ error: 'invalidRequest' }, { status: 400 });
    }
    const result = await reactivateRegistration(id);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: result.error === 'REGISTRATION_NOT_FOUND' ? 404 : 400 }
      );
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Reactivate registration error:', error);
    return NextResponse.json({ error: 'genericError' }, { status: 500 });
  }
}
