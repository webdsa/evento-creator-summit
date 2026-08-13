import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { listRegistrations, listInstitutions, listVouchers } from '@/lib/db';

/**
 * GET /api/admin/stats
 * Retorna registrations, institutions e vouchers em uma única chamada (dashboard).
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    await requireAdmin(authHeader);
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  try {
    const [registrations, institutions, vouchers] = await Promise.all([
      listRegistrations(),
      listInstitutions(),
      listVouchers(),
    ]);
    return NextResponse.json({
      registrations,
      institutions,
      vouchers,
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json({ error: 'genericError' }, { status: 500 });
  }
}
