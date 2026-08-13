import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { getRegistrationById } from '@/lib/db';
import { sendRegistrationWhatsApp } from '@/lib/whatsapp';
import type { Language } from '@/lib/whatsapp';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization');
    await requireAdmin(authHeader);
  } catch {
    return NextResponse.json(
      { error: 'unauthorized' },
      { status: 401 }
    );
  }

  try {
    const { id } = await params;
    if (!id || typeof id !== 'string' || id.length > 1500) {
      return NextResponse.json({ error: 'invalidRequest' }, { status: 400 });
    }
    const registration = await getRegistrationById(id);

    if (!registration) {
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

    const phone = (registration.phone ?? '').trim();
    if (!phone || !phone.replace(/\D/g, '')) {
      return NextResponse.json(
        { error: 'noPhone', detail: 'Inscrição sem telefone para envio no WhatsApp.' },
        { status: 400 }
      );
    }

    const appOrigin =
      process.env.NEXT_PUBLIC_APP_URL?.trim() ||
      request.nextUrl?.origin ||
      (request.headers.get('x-forwarded-proto') && request.headers.get('host')
        ? `${request.headers.get('x-forwarded-proto')}://${request.headers.get('host')}`
        : '');
    const statusUrl = appOrigin
      ? `${appOrigin.replace(/\/$/, '')}/consulta?code=${encodeURIComponent(registration.registration_code)}`
      : `https://${request.headers.get('host') || 'localhost'}/consulta?code=${encodeURIComponent(registration.registration_code)}`;

    const lang: Language = registration.language === 'es' ? 'es' : 'pt-BR';
    const institutionName = registration.institution_name ?? registration.institution?.name ?? '';
    const result = await sendRegistrationWhatsApp({
      phone: registration.phone,
      email: registration.email,
      registrationCode: registration.registration_code,
      language: lang,
      statusUrl,
      fullName: registration.full_name,
      institutionName: institutionName || undefined,
      role: registration.role ?? undefined,
      gender: registration.gender ?? undefined,
    });

    if (result.sent) {
      return NextResponse.json({
        success: true,
        message: 'WhatsApp enviado com sucesso',
      });
    }

    const isNotConfigured = /não configurado|not configured/i.test(result.error ?? '');
    return NextResponse.json(
      { error: 'whatsAppSendFailed', detail: result.error ?? 'Falha ao enviar WhatsApp.' },
      { status: isNotConfigured ? 503 : 502 }
    );
  } catch (error) {
    console.error('Resend WhatsApp error:', error);
    return NextResponse.json(
      { error: 'genericError' },
      { status: 500 }
    );
  }
}
