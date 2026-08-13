import { NextRequest, NextResponse } from 'next/server';
import { createRegistration, getRegistrationById, updateRegistration } from '@/lib/db';
import { sendConfirmationEmail } from '@/lib/email';
import { checkRateLimit, getRateLimitIdentifier } from '@/lib/rate-limit';
import { sendRegistrationWhatsApp, createUnnichatContact } from '@/lib/whatsapp';

const ROLE_OPTIONS = ['Administração', 'Coordenador', 'Departamental', 'Designer', 'Editor(a)', 'Gerente', 'Produtor(a)', 'Secretária'] as const;
const GENDER_OPTIONS = ['Masculino', 'Feminino'] as const;
const SHIRT_SIZE_OPTIONS = ['PP', 'P', 'M', 'G', 'GG', 'XG'] as const;
const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

interface RegistrationRequest {
  voucherCode: string;
  fullName: string;
  email: string;
  phone: string;
  gender: string;
  shirtSize: string;
  campo: string;
  plataforma: string;
  seguidores: number | string;
  documento: string;
  conteudo: string;
  linkOrHandle: string;
  wantsToKnowNovoTempo?: boolean;
  tourNt?: boolean;
  flightDepartureTime: string;
  flightReturnTime: string;
  role: string;
  language: 'pt-BR' | 'es';
}

export async function POST(request: NextRequest) {
  const identifier = getRateLimitIdentifier(request);
  const rateLimit = checkRateLimit(identifier);

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'rateLimitExceeded' },
      { status: 429 }
    );
  }

  let body: RegistrationRequest;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'invalidRequest' },
      { status: 400 }
    );
  }

  const {
    voucherCode,
    fullName,
    email,
    phone,
    gender,
    shirtSize,
    campo,
    plataforma,
    seguidores,
    documento,
    conteudo,
    linkOrHandle,
    wantsToKnowNovoTempo,
    tourNt,
    flightDepartureTime,
    flightReturnTime,
    role,
    language,
  } = body;

  const rawVoucherCode = String(voucherCode ?? '').trim();
  const rawFullName = String(fullName ?? '').trim();
  const rawEmail = String(email ?? '').trim().toLowerCase();
  const rawPhone = String(phone ?? '').trim();
  const rawGender = String(gender ?? '').trim();
  const rawShirtSize = String(shirtSize ?? '').trim();
  const rawCampo = String(campo ?? '').trim();
  const rawPlataforma = String(plataforma ?? '').trim();
  const rawDocumento = String(documento ?? '').trim();
  const rawConteudo = String(conteudo ?? '').trim();
  const rawLinkOrHandle = String(linkOrHandle ?? '').trim();
  const rawFlightDepartureTime = String(flightDepartureTime ?? '').trim();
  const rawFlightReturnTime = String(flightReturnTime ?? '').trim();
  const rawWantsToKnowNovoTempo = wantsToKnowNovoTempo === true;
  const rawTourNt = tourNt === true;
  const rawRole = String(role ?? '').trim();
  const seguidoresInput = seguidores === 0 || seguidores === '0' ? '0' : String(seguidores ?? '').trim();
  const rawSeguidores = Number(seguidoresInput.replace(/\D/g, ''));

  const MAX_VOUCHER_CODE = 64;
  const MAX_FULL_NAME = 200;
  const MAX_EMAIL = 254;
  const MAX_PHONE = 50;
  const MAX_ROLE = 100;
  const MAX_CAMPO = 200;
  const MAX_PLATAFORMA = 100;
  const MAX_DOCUMENTO = 80;
  const MAX_CONTEUDO = 500;
  const MAX_LINK = 300;
  const MAX_SEGUIDORES = 1_000_000_000;

  if (!rawVoucherCode || !rawFullName || !rawEmail || !rawPhone || !language) {
    return NextResponse.json(
      { error: 'missingFields' },
      { status: 400 }
    );
  }

  if (
    !rawGender ||
    !rawRole ||
    !rawShirtSize ||
    !rawCampo ||
    !rawPlataforma ||
    !rawDocumento ||
    !rawConteudo ||
    !rawLinkOrHandle ||
    !rawFlightDepartureTime ||
    !rawFlightReturnTime ||
    seguidoresInput === ''
  ) {
    return NextResponse.json(
      { error: 'missingFields' },
      { status: 400 }
    );
  }

  if (
    rawVoucherCode.length > MAX_VOUCHER_CODE ||
    rawFullName.length > MAX_FULL_NAME ||
    rawEmail.length > MAX_EMAIL ||
    rawPhone.length > MAX_PHONE ||
    rawRole.length > MAX_ROLE ||
    rawCampo.length > MAX_CAMPO ||
    rawPlataforma.length > MAX_PLATAFORMA ||
    rawDocumento.length > MAX_DOCUMENTO ||
    rawConteudo.length > MAX_CONTEUDO ||
    rawLinkOrHandle.length > MAX_LINK
  ) {
    return NextResponse.json(
      { error: 'invalidRequest' },
      { status: 400 }
    );
  }

  if (!Number.isInteger(rawSeguidores) || rawSeguidores < 0 || rawSeguidores > MAX_SEGUIDORES) {
    return NextResponse.json(
      { error: 'invalidRequest' },
      { status: 400 }
    );
  }

  if (!TIME_REGEX.test(rawFlightDepartureTime) || !TIME_REGEX.test(rawFlightReturnTime)) {
    return NextResponse.json(
      { error: 'invalidRequest' },
      { status: 400 }
    );
  }

  const validGenders = new Set(GENDER_OPTIONS);
  if (!validGenders.has(rawGender as (typeof GENDER_OPTIONS)[number])) {
    return NextResponse.json(
      { error: 'invalidGender' },
      { status: 400 }
    );
  }

  const validRoles = new Set(ROLE_OPTIONS);
  if (!validRoles.has(rawRole as (typeof ROLE_OPTIONS)[number])) {
    return NextResponse.json(
      { error: 'invalidRole' },
      { status: 400 }
    );
  }

  const validShirtSizes = new Set(SHIRT_SIZE_OPTIONS);
  if (!validShirtSizes.has(rawShirtSize as (typeof SHIRT_SIZE_OPTIONS)[number])) {
    return NextResponse.json(
      { error: 'invalidRequest' },
      { status: 400 }
    );
  }

  if (language !== 'pt-BR' && language !== 'es') {
    return NextResponse.json(
      { error: 'invalidLanguage' },
      { status: 400 }
    );
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(rawEmail)) {
    return NextResponse.json(
      { error: 'invalidEmail' },
      { status: 400 }
    );
  }

  try {
    const result = await createRegistration({
      p_voucher_code: rawVoucherCode.toUpperCase(),
      p_full_name: rawFullName,
      p_email: rawEmail,
      p_phone: rawPhone,
      p_gender: rawGender,
      p_shirt_size: rawShirtSize,
      p_campo: rawCampo,
      p_plataforma: rawPlataforma,
      p_seguidores: rawSeguidores,
      p_documento: rawDocumento,
      p_conteudo: rawConteudo,
      p_link_or_handle: rawLinkOrHandle,
      p_wants_to_know_novo_tempo: rawWantsToKnowNovoTempo,
      p_tour_nt: rawTourNt,
      p_flight_departure_time: rawFlightDepartureTime,
      p_flight_return_time: rawFlightReturnTime,
      p_role: rawRole,
      p_language: language,
    });

    if (!result.success) {
      const errorMap: Record<string, number> = {
        VOUCHER_NOT_FOUND: 404,
        VOUCHER_INACTIVE: 400,
        VOUCHER_EXPIRED: 400,
        VOUCHER_NO_QUOTA: 400,
        INSTITUTION_NOT_FOUND: 404,
        INSTITUTION_INACTIVE: 400,
        INSTITUTION_NO_QUOTA: 400,
        EMAIL_ALREADY_REGISTERED: 409,
        INVALID_LANGUAGE: 400,
      };

      const statusCode = errorMap[result.error] || 400;
      const errorKey = result.error.toLowerCase().replace(/_/g, '');

      return NextResponse.json(
        { error: errorKey },
        { status: statusCode }
      );
    }

    const registration = await getRegistrationById(result.registration_id);

    if (!registration) {
      return NextResponse.json(
        { error: 'registrationFailed' },
        { status: 500 }
      );
    }

    const institutionName = registration.institution?.name ?? '';

    const appOrigin =
      process.env.NEXT_PUBLIC_APP_URL?.trim() ||
      request.nextUrl?.origin ||
      (request.headers.get('x-forwarded-proto') && request.headers.get('host')
        ? `${request.headers.get('x-forwarded-proto')}://${request.headers.get('host')}`
        : '');
    const statusUrl = appOrigin
      ? `${appOrigin.replace(/\/$/, '')}/consulta?code=${encodeURIComponent(registration.registration_code)}`
      : `https://${request.headers.get('host') || 'localhost'}/consulta?code=${encodeURIComponent(registration.registration_code)}`;

    const emailResult = await sendConfirmationEmail(
      {
        full_name: registration.full_name,
        email: registration.email,
        phone: registration.phone,
        gender: registration.gender,
        shirt_size: registration.shirt_size,
        role: registration.role,
        registration_code: registration.registration_code,
        language: registration.language,
      },
      institutionName,
      statusUrl
    );

    if (emailResult.sent) {
      await updateRegistration(registration.id, {
        confirmation_email_sent_at: new Date().toISOString(),
        confirmation_email_last_error: null,
      });
    } else {
      await updateRegistration(registration.id, {
        confirmation_email_last_error: emailResult.error,
      });
    }

    // Criar contato no Unnichat (POST /contact) com tag por idioma (MidiaTecPT ou MidiaTecES)
    const contactResult = await createUnnichatContact({
      phone: registration.phone,
      fullName: registration.full_name,
      email: registration.email,
      language: registration.language,
    });
    if (!contactResult.created && contactResult.error) {
      console.warn('[Registration] Unnichat contact not created:', contactResult.error);
    }

    const whatsappResult = await sendRegistrationWhatsApp({
      phone: registration.phone,
      email: registration.email,
      registrationCode: registration.registration_code,
      language: registration.language,
      statusUrl,
      fullName: registration.full_name,
      institutionName: institutionName || undefined,
      role: registration.role ?? undefined,
      gender: registration.gender ?? undefined,
    });
    if (!whatsappResult.sent && whatsappResult.error) {
      console.warn('[Registration] WhatsApp (Unnichat) not sent:', whatsappResult.error);
    }

    return NextResponse.json({
      success: true,
      registrationCode: registration.registration_code,
      fullName: registration.full_name,
      email: registration.email,
      phone: registration.phone,
      gender: registration.gender,
      shirtSize: registration.shirt_size,
      campo: registration.campo,
      plataforma: registration.plataforma,
      seguidores: registration.seguidores,
      documento: registration.documento,
      conteudo: registration.conteudo,
      linkOrHandle: registration.link_or_handle,
      wantsToKnowNovoTempo: registration.wants_to_know_novo_tempo ?? false,
      tourNt: registration.tour_nt ?? false,
      flightDepartureTime: registration.flight_departure_time,
      flightReturnTime: registration.flight_return_time,
      role: registration.role,
      institution: institutionName,
      institutionGroup: registration.institution?.group,
      language: registration.language,
    });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'genericError' },
      { status: 500 }
    );
  }
}
