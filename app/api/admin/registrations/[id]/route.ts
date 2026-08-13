import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { deleteRegistration, getRegistrationById, updateRegistration } from '@/lib/db';

async function checkAuth(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  await requireAdmin(authHeader);
}

function badId(id: unknown): boolean {
  return !id || typeof id !== 'string' || id.length > 1500;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await checkAuth(request);
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  try {
    const { id } = await params;
    if (badId(id)) {
      return NextResponse.json({ error: 'invalidRequest' }, { status: 400 });
    }
    const registration = await getRegistrationById(id);
    if (!registration) {
      return NextResponse.json({ error: 'notFound' }, { status: 404 });
    }
    return NextResponse.json(registration);
  } catch (error) {
    console.error('Get registration error:', error);
    return NextResponse.json({ error: 'genericError' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await checkAuth(request);
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  try {
    const { id } = await params;
    if (badId(id)) {
      return NextResponse.json({ error: 'invalidRequest' }, { status: 400 });
    }
    const registration = await getRegistrationById(id);
    if (!registration) {
      return NextResponse.json({ error: 'notFound' }, { status: 404 });
    }
    const body = await request.json();
    const fullName = typeof body.full_name === 'string' ? body.full_name.trim() : undefined;
    const email = typeof body.email === 'string' ? body.email.trim() : undefined;
    const phone = typeof body.phone === 'string' ? body.phone.trim() : undefined;
    const gender = typeof body.gender === 'string' ? body.gender.trim() || undefined : undefined;
    const shirtSize = typeof body.shirt_size === 'string' ? body.shirt_size.trim() || undefined : undefined;
    const campo = typeof body.campo === 'string' ? body.campo.trim() || undefined : undefined;
    const plataforma = typeof body.plataforma === 'string' ? body.plataforma.trim() || undefined : undefined;
    const documento = typeof body.documento === 'string' ? body.documento.trim() || undefined : undefined;
    const conteudo = typeof body.conteudo === 'string' ? body.conteudo.trim() || undefined : undefined;
    const linkOrHandle = typeof body.link_or_handle === 'string' ? body.link_or_handle.trim() || undefined : undefined;
    const flightDepartureTime =
      typeof body.flight_departure_time === 'string' ? body.flight_departure_time.trim() || undefined : undefined;
    const flightReturnTime =
      typeof body.flight_return_time === 'string' ? body.flight_return_time.trim() || undefined : undefined;
    const role = typeof body.role === 'string' ? body.role.trim() || undefined : undefined;
    const language = body.language === 'pt-BR' || body.language === 'es' ? body.language : undefined;
    const wantsToKnowNovoTempo =
      typeof body.wants_to_know_novo_tempo === 'boolean' ? body.wants_to_know_novo_tempo : undefined;
    const tourNt = typeof body.tour_nt === 'boolean' ? body.tour_nt : undefined;
    const seguidores =
      typeof body.seguidores === 'number' && Number.isFinite(body.seguidores)
        ? body.seguidores
        : typeof body.seguidores === 'string' && body.seguidores.trim() !== ''
          ? Number(body.seguidores.replace(/\D/g, ''))
          : undefined;

    const updates: Parameters<typeof updateRegistration>[1] = {};
    if (fullName !== undefined) updates.full_name = fullName;
    if (email !== undefined) {
      updates.email = email;
      updates.email_normalized = email.toLowerCase();
    }
    if (phone !== undefined) updates.phone = phone;
    if (gender !== undefined) updates.gender = gender;
    if (shirtSize !== undefined) updates.shirt_size = shirtSize;
    if (campo !== undefined) updates.campo = campo;
    if (plataforma !== undefined) updates.plataforma = plataforma;
    if (seguidores !== undefined && Number.isInteger(seguidores)) updates.seguidores = seguidores;
    if (documento !== undefined) updates.documento = documento;
    if (conteudo !== undefined) updates.conteudo = conteudo;
    if (linkOrHandle !== undefined) updates.link_or_handle = linkOrHandle;
    if (wantsToKnowNovoTempo !== undefined) updates.wants_to_know_novo_tempo = wantsToKnowNovoTempo;
    if (tourNt !== undefined) updates.tour_nt = tourNt;
    if (flightDepartureTime !== undefined) updates.flight_departure_time = flightDepartureTime;
    if (flightReturnTime !== undefined) updates.flight_return_time = flightReturnTime;
    if (role !== undefined) updates.role = role;
    if (language !== undefined) updates.language = language;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'invalidRequest' }, { status: 400 });
    }

    await updateRegistration(id, updates);
    const updated = await getRegistrationById(id);
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Patch registration error:', error);
    return NextResponse.json({ error: 'genericError' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await checkAuth(request);
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  try {
    const { id } = await params;
    if (badId(id)) {
      return NextResponse.json({ error: 'invalidRequest' }, { status: 400 });
    }
    const result = await deleteRegistration(id);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: result.error === 'REGISTRATION_NOT_FOUND' ? 404 : 400 }
      );
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete registration error:', error);
    return NextResponse.json({ error: 'genericError' }, { status: 500 });
  }
}
