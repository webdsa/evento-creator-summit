import { NextRequest, NextResponse } from 'next/server';
import { createRegistration, getRegistrationById, updateRegistration } from '@/lib/db';
import { sendConfirmationEmail } from '@/lib/email';
import { checkRateLimit, getRateLimitIdentifier } from '@/lib/rate-limit';
import { sendRegistrationWhatsApp, createUnnichatContact } from '@/lib/whatsapp';
import { validateDocument } from '@/lib/document';

const GENDER_OPTIONS = ['Masculino', 'Feminino'] as const;
const SHIRT_SIZE_OPTIONS = ['PP', 'P', 'M', 'G', 'GG', 'XG'] as const;

interface RegistrationRequest {
  voucherCode: string;
  fullName: string;
  email: string;
  phone: string;
  gender: string;
  shirtSize: string;
  documentCountry: string;
  documentType: string;
  documento: string;
  wantsToKnowNovoTempo?: boolean;
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
    documentCountry,
    documentType,
    documento,
    wantsToKnowNovoTempo,
    language,
  } = body;

  const rawVoucherCode = String(voucherCode ?? '').trim();
  const rawFullName = String(fullName ?? '').trim();
  const rawEmail = String(email ?? '').trim().toLowerCase();
  const rawPhone = String(phone ?? '').trim();
  const rawGender = String(gender ?? '').trim();
  const rawShirtSize = String(shirtSize ?? '').trim();
  const rawWantsToKnowNovoTempo = wantsToKnowNovoTempo === true;
  const parsedDocument = validateDocument(
    String(documentCountry ?? ''),
    String(documentType ?? ''),
    String(documento ?? '')
  );

  const MAX_VOUCHER_CODE = 64;
  const MAX_FULL_NAME = 200;
  const MAX_EMAIL = 254;
  const MAX_PHONE = 50;

  if (!rawVoucherCode || !rawFullName || !rawEmail || !rawPhone || !language) {
    return NextResponse.json(
      { error: 'missingFields' },
      { status: 400 }
    );
  }

  if (!rawGender || !rawShirtSize) {
    return NextResponse.json(
      { error: 'missingFields' },
      { status: 400 }
    );
  }

  if (!parsedDocument.ok) {
    return NextResponse.json(
      { error: 'invalidDocumento' },
      { status: 400 }
    );
  }

  if (
    rawVoucherCode.length > MAX_VOUCHER_CODE ||
    rawFullName.length > MAX_FULL_NAME ||
    rawEmail.length > MAX_EMAIL ||
    rawPhone.length > MAX_PHONE
  ) {
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
      p_documento: parsedDocument.value,
      p_document_country: parsedDocument.country,
      p_document_type: parsedDocument.type,
      p_wants_to_know_novo_tempo: rawWantsToKnowNovoTempo,
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
        DOCUMENT_ALREADY_REGISTERED: 409,
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

    // Criar contato no Unnichat (POST /contact) com tag por idioma (UNNICHAT_TAG_PT ou UNNICHAT_TAG_ES)
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
      documento: registration.documento,
      documentType: registration.document_type,
      documentCountry: registration.document_country,
      wantsToKnowNovoTempo: registration.wants_to_know_novo_tempo ?? false,
      institution: institutionName,
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
