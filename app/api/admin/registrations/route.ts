import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { listRegistrations } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    await requireAdmin(authHeader);
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  try {
    const list = await listRegistrations();
    return NextResponse.json(list);
  } catch (error) {
    console.error('List registrations error:', error);
    return NextResponse.json({ error: 'genericError' }, { status: 500 });
  }
}
