import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { listWorkshopsWithVagas } from '@/lib/db';

/**
 * GET /api/admin/workshops/vagas
 * Retorna workshops com vagas por ocorrência (seção) para o dashboard.
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    await requireAdmin(authHeader);
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  try {
    const list = await listWorkshopsWithVagas();
    return NextResponse.json(list);
  } catch (error) {
    console.error('Workshops vagas error:', error);
    return NextResponse.json({ error: 'genericError' }, { status: 500 });
  }
}
