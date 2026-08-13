import { NextRequest, NextResponse } from 'next/server';
import { getRegistrationByCodeAndEmail } from '@/lib/db';
import { checkRateLimit, getRateLimitIdentifier } from '@/lib/rate-limit';

export async function GET(request: NextRequest) {
  const identifier = getRateLimitIdentifier(request);
  const rateLimit = checkRateLimit(identifier);

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'rateLimitExceeded' },
      { status: 429 }
    );
  }

  const MAX_CODE_LENGTH = 32;
  const MAX_EMAIL_LENGTH = 254;

  const code = request.nextUrl.searchParams.get('code')?.trim().slice(0, MAX_CODE_LENGTH) ?? '';
  const email = request.nextUrl.searchParams.get('email')?.trim().toLowerCase().slice(0, MAX_EMAIL_LENGTH) ?? '';

  if (!code || !email) {
    return NextResponse.json(
      { error: 'missingFields' },
      { status: 400 }
    );
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return NextResponse.json(
      { error: 'invalidEmail' },
      { status: 400 }
    );
  }

  try {
    const registration = await getRegistrationByCodeAndEmail(code, email);

    if (!registration) {
      return NextResponse.json(
        { error: 'notFound' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      status: registration.status,
      fullName: registration.full_name,
      email: registration.email,
      institutionName: registration.institution?.name ?? registration.institution_name ?? '',
      institutionGroup: registration.institution?.group,
      registrationCode: registration.registration_code,
      createdAt: registration.created_at,
      workshopIds:
        registration.workshop_occurrence_keys ??
        registration.workshop_ids?.map((id) => `${id}:0`) ??
        [],
    });
  } catch (error) {
    console.error('Registration status lookup error:', error);
    return NextResponse.json(
      { error: 'genericError' },
      { status: 500 }
    );
  }
}
