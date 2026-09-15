import { NextRequest, NextResponse } from 'next/server';
import { requireCheckinOrAdmin } from '@/lib/auth';
import { searchRegistrationsForCheckin } from '@/lib/db';

function toLookupPayload(reg: {
  id: string;
  registration_code: string;
  full_name: string;
  email: string;
  documento: string;
  checked_in_at: string | null;
}) {
  return {
    id: reg.id,
    registrationCode: reg.registration_code,
    fullName: reg.full_name,
    email: reg.email,
    documento: reg.documento,
    checkedInAt: reg.checked_in_at,
  };
}

/**
 * GET /api/admin/checkin/lookup?q=...  (ou ?code=MT-000123)
 * Busca por código, nome, e-mail/endereço ou documento. Código exato devolve um único resultado.
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    await requireCheckinOrAdmin(authHeader);
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const q =
    request.nextUrl.searchParams.get('q')?.trim() ||
    request.nextUrl.searchParams.get('code')?.trim();
  if (!q) {
    return NextResponse.json({ error: 'query required' }, { status: 400 });
  }

  try {
    const found = await searchRegistrationsForCheckin(q);
    if (found.length === 0) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    const confirmed = found.filter((r) => r.status === 'confirmed');
    if (confirmed.length === 0) {
      return NextResponse.json({ error: 'registration_canceled' }, { status: 400 });
    }

    if (confirmed.length === 1) {
      return NextResponse.json(toLookupPayload(confirmed[0]));
    }

    return NextResponse.json({
      matches: confirmed.map(toLookupPayload),
    });
  } catch (e) {
    console.error('Check-in lookup error:', e);
    return NextResponse.json({ error: 'genericError' }, { status: 500 });
  }
}
