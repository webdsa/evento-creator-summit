import { NextRequest, NextResponse } from 'next/server';
import { canAccessRegistration, requireRegistrationsAccess } from '@/lib/auth';
import { getRegistrationById, updateRegistration } from '@/lib/db';
import { getEmailProvider, sendConfirmationEmail } from '@/lib/email';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let staff;
  try {
    const authHeader = request.headers.get('authorization');
    staff = await requireRegistrationsAccess(authHeader);
  } catch {
    return NextResponse.json(
      { error: 'unauthorized' },
      { status: 401 }
    );
  }

  if (!getEmailProvider()) {
    return NextResponse.json(
      {
        error: 'emailNotConfigured',
        detail: 'Nenhum provedor de e-mail configurado. Defina SENDGRID_API_KEY ou RESEND_API_KEY no .env e, ao usar Resend, RESEND_FROM_EMAIL com um domínio verificado.',
      },
      { status: 503 }
    );
  }

  try {
    const { id } = await params;
    if (!id || typeof id !== 'string' || id.length > 1500) {
      return NextResponse.json({ error: 'invalidRequest' }, { status: 400 });
    }
    const registration = await getRegistrationById(id);

    if (!registration || !canAccessRegistration(staff, registration.institution_id)) {
      return NextResponse.json(
        { error: 'notFound' },
        { status: 404 }
      );
    }

    if (registration.status !== 'confirmed') {
      return NextResponse.json(
        { error: 'registrationNotConfirmed' },
        { status: 400 }
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
      await updateRegistration(id, {
        confirmation_email_sent_at: new Date().toISOString(),
        confirmation_email_last_error: null,
      });
      return NextResponse.json({
        success: true,
        message: 'Email resent successfully',
      });
    }

    const errorDetail = emailResult.error ?? 'Erro desconhecido ao enviar e-mail.';
    await updateRegistration(id, {
      confirmation_email_last_error: errorDetail,
    });
    const isNotConfigured =
      /não configurad|not configured|Nenhum provedor/i.test(errorDetail);
    return NextResponse.json(
      { error: 'emailSendFailed', detail: errorDetail },
      { status: isNotConfigured ? 503 : 502 }
    );
  } catch (error) {
    console.error('Resend email error:', error);
    return NextResponse.json(
      { error: 'genericError' },
      { status: 500 }
    );
  }
}
