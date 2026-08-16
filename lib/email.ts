/**
 * Envio de e-mails via SendGrid ou Resend.
 * Configure EMAIL_PROVIDER=sendgrid ou EMAIL_PROVIDER=resend (ou deixe em branco para auto-detect).
 * SendGrid: SENDGRID_API_KEY e opcionalmente SENDGRID_FROM_EMAIL.
 * Resend: RESEND_API_KEY e opcionalmente RESEND_FROM_EMAIL.
 */

import sgMail from '@sendgrid/mail';
import { Resend } from 'resend';

export type EmailProvider = 'sendgrid' | 'resend';

export type Language = 'pt-BR' | 'es';

export interface RegistrationForEmail {
  full_name: string;
  email: string;
  phone: string;
  gender?: string;
  shirt_size?: string;
  role?: string;
  registration_code: string;
  language: Language;
}

function getStatusUrl(registrationCode: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL?.trim()?.replace(/\/$/, '');
  if (!base) return '';
  return `${base}/consulta?code=${encodeURIComponent(registrationCode)}`;
}

/** Retorna a URL pública do QR para usar no e-mail (mais confiável no Gmail que anexo CID). */
function getQRCodeImageUrl(baseUrl: string, registrationCode: string): string {
  if (!baseUrl || !registrationCode) return '';
  try {
    const origin = new URL(baseUrl).origin;
    return `${origin}/api/public/qrcode?code=${encodeURIComponent(registrationCode)}`;
  } catch {
    return '';
  }
}

const emailTemplates: Record<
  Language,
  {
    subject: string;
    getBody: (
      registration: RegistrationForEmail,
      institutionName: string,
      statusUrl: string,
      qrImageSrc: string
    ) => string;
  }
> = {
  'pt-BR': {
    subject: 'Inscrição confirmada — Creators Summit 2026',
    getBody: (registration, institutionName, statusUrl, qrImageSrc) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
    .content { background: #f9fafb; padding: 30px; }
    .code-box { background: white; border: 2px solid #2563eb; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
    .code { font-size: 24px; font-weight: bold; color: #2563eb; letter-spacing: 2px; }
    .details { background: white; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .detail-row { padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
    .detail-label { font-weight: bold; color: #6b7280; }
    .footer { text-align: center; color: #6b7280; padding: 20px; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Creators Summit 2026</h1>
    </div>
    <div class="content">
      <h2>Olá, ${registration.full_name}!</h2>
      <p>Sua inscrição para o evento Creators Summit 2026 foi confirmada com sucesso!</p>

      <div class="code-box">
        <p style="margin: 0; color: #6b7280;">Código de Registro</p>
        <p class="code">${registration.registration_code}</p>
      </div>
      ${qrImageSrc ? `
      <div class="qr-box" style="background: white; border: 2px solid #7c3aed; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
        <p style="margin: 0 0 12px 0; color: #6b7280; font-weight: bold;">Seu QR para check-in no evento</p>
        <p style="margin: 0 0 12px 0; font-size: 14px; color: #4b5563;">Mostre este código na entrada para o organizador escanear.</p>
        <img src="${qrImageSrc}" alt="QR Code para check-in" width="200" height="200" style="display: block; margin: 0 auto;" />
        <p style="margin: 12px 0 0 0; font-size: 12px; color: #6b7280;">Código: ${registration.registration_code}</p>
      </div>
      ` : ''}

      <div class="details">
        <h3>Detalhes da sua inscrição</h3>
        <div class="detail-row">
          <span class="detail-label">Nome:</span> ${registration.full_name}
        </div>
        <div class="detail-row">
          <span class="detail-label">E-mail:</span> ${registration.email}
        </div>
        <div class="detail-row">
          <span class="detail-label">Telefone:</span> ${registration.phone}
        </div>
        <div class="detail-row">
          <span class="detail-label">Instituição:</span> ${institutionName}
        </div>
      </div>
      ${statusUrl ? `
      <p style="text-align: center; margin: 24px 0;">
        Para consultar o status da sua inscrição acesse:<br>
        <a href="${statusUrl}" style="display: inline-block; margin-top: 12px; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">Consultar inscrição</a>
      </p>
      <p style="text-align: center; font-size: 14px; color: #6b7280;">Ou copie o link: <a href="${statusUrl}" style="color: #2563eb;">${statusUrl}</a></p>
      ` : ''}

      <p style="text-align: center; margin-top: 30px;">
        <strong>Aguardamos você no evento!</strong>
      </p>
    </div>
    <div class="footer">
      <p>Este é um e-mail automático. Por favor, não responda.</p>
    </div>
  </div>
</body>
</html>
    `.trim(),
  },
  es: {
    subject: 'Inscripción confirmada — Creators Summit 2026',
    getBody: (registration, institutionName, statusUrl, qrImageSrc) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
    .content { background: #f9fafb; padding: 30px; }
    .code-box { background: white; border: 2px solid #2563eb; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
    .code { font-size: 24px; font-weight: bold; color: #2563eb; letter-spacing: 2px; }
    .details { background: white; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .detail-row { padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
    .detail-label { font-weight: bold; color: #6b7280; }
    .footer { text-align: center; color: #6b7280; padding: 20px; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Creators Summit 2026</h1>
    </div>
    <div class="content">
      <h2>¡Hola, ${registration.full_name}!</h2>
      <p>¡Su inscripción para el evento Creators Summit 2026 fue confirmada con éxito!</p>

      <div class="code-box">
        <p style="margin: 0; color: #6b7280;">Código de Registro</p>
        <p class="code">${registration.registration_code}</p>
      </div>
      ${qrImageSrc ? `
      <div class="qr-box" style="background: white; border: 2px solid #7c3aed; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
        <p style="margin: 0 0 12px 0; color: #6b7280; font-weight: bold;">Su código QR para registro en el evento</p>
        <p style="margin: 0 0 12px 0; font-size: 14px; color: #4b5563;">Muestre este código en la entrada para que el organizador lo escanee.</p>
        <img src="${qrImageSrc}" alt="Código QR para registro" width="200" height="200" style="display: block; margin: 0 auto;" />
        <p style="margin: 12px 0 0 0; font-size: 12px; color: #6b7280;">Código: ${registration.registration_code}</p>
      </div>
      ` : ''}

      <div class="details">
        <h3>Detalles de su inscripción</h3>
        <div class="detail-row">
          <span class="detail-label">Nombre:</span> ${registration.full_name}
        </div>
        <div class="detail-row">
          <span class="detail-label">Correo Electrónico:</span> ${registration.email}
        </div>
        <div class="detail-row">
          <span class="detail-label">Teléfono:</span> ${registration.phone}
        </div>
        <div class="detail-row">
          <span class="detail-label">Institución:</span> ${institutionName}
        </div>
      </div>
      ${statusUrl ? `
      <p style="text-align: center; margin: 24px 0;">
        Para consultar el estado de su inscripción acceda a:<br>
        <a href="${statusUrl}" style="display: inline-block; margin-top: 12px; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">Consultar inscripción</a>
      </p>
      <p style="text-align: center; font-size: 14px; color: #6b7280;">O copie el enlace: <a href="${statusUrl}" style="color: #2563eb;">${statusUrl}</a></p>
      ` : ''}

      <p style="text-align: center; margin-top: 30px;">
        <strong>¡Le esperamos en el evento!</strong>
      </p>
    </div>
    <div class="footer">
      <p>Este es un correo automático. Por favor, no responda.</p>
    </div>
  </div>
</body>
</html>
    `.trim(),
  },
};

const DEFAULT_FROM_EMAIL = 'noreply@midiatec.example.com';

function getFromEmail(provider: EmailProvider): string {
  if (provider === 'resend') {
    const from = process.env.RESEND_FROM_EMAIL?.trim();
    if (from) return from;
  } else {
    const from = process.env.SENDGRID_FROM_EMAIL?.trim();
    if (from) return from;
  }
  return DEFAULT_FROM_EMAIL;
}

/**
 * Retorna o provedor de e-mail a ser usado (env EMAIL_PROVIDER ou auto-detect por API keys).
 */
export function getEmailProvider(): EmailProvider | null {
  const envProvider = process.env.EMAIL_PROVIDER?.trim().toLowerCase();
  if (envProvider === 'sendgrid' || envProvider === 'resend') return envProvider;
  if (process.env.SENDGRID_API_KEY?.trim()) return 'sendgrid';
  if (process.env.RESEND_API_KEY?.trim()) return 'resend';
  return null;
}

/**
 * Verifica se o SendGrid está configurado (API key presente).
 */
export function isSendGridConfigured(): boolean {
  return Boolean(process.env.SENDGRID_API_KEY?.trim());
}

/**
 * Verifica se o Resend está configurado (API key presente).
 */
export function isResendConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

/**
 * Verifica se algum provedor de e-mail está configurado.
 */
export function isEmailConfigured(): boolean {
  return isSendGridConfigured() || isResendConfigured();
}

async function sendViaSendGrid(
  to: string,
  from: string,
  subject: string,
  html: string
): Promise<{ sent: true } | { sent: false; error: string }> {
  const apiKey = process.env.SENDGRID_API_KEY?.trim();
  if (!apiKey) return { sent: false, error: 'SENDGRID_API_KEY não configurada' };
  sgMail.setApiKey(apiKey);
  try {
    await sgMail.send({ to, from, subject, html });
    return { sent: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { sent: false, error: message };
  }
}

async function sendViaResend(
  to: string,
  from: string,
  subject: string,
  html: string
): Promise<{ sent: true } | { sent: false; error: string }> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return { sent: false, error: 'RESEND_API_KEY não configurada' };
  const resend = new Resend(apiKey);
  try {
    const { error } = await resend.emails.send({ from, to, subject, html });
    if (error) return { sent: false, error: typeof error === 'string' ? error : JSON.stringify(error) };
    return { sent: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { sent: false, error: message };
  }
}

/**
 * Envia o e-mail de confirmação de inscrição via SendGrid ou Resend (conforme EMAIL_PROVIDER ou auto-detect).
 * @returns { sent: true } em sucesso ou { sent: false, error: string } em falha.
 */
export async function sendConfirmationEmail(
  registration: RegistrationForEmail,
  institutionName: string,
  statusUrl?: string
): Promise<{ sent: true } | { sent: false; error: string }> {
  const provider = getEmailProvider();
  if (!provider) {
    return { sent: false, error: 'Nenhum provedor de e-mail configurado (SENDGRID_API_KEY ou RESEND_API_KEY)' };
  }

  const url = statusUrl ?? getStatusUrl(registration.registration_code);
  const lang = registration.language === 'es' ? 'es' : 'pt-BR';
  const template = emailTemplates[lang];
  const subject = template.subject;
  const qrImageSrc = getQRCodeImageUrl(url, registration.registration_code);
  const html = template.getBody(registration, institutionName, url, qrImageSrc);
  const from = getFromEmail(provider);

  if (provider === 'resend') {
    return sendViaResend(registration.email, from, subject, html);
  }
  return sendViaSendGrid(registration.email, from, subject, html);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Envia e-mail com URL de acesso, e-mail e senha para um usuário recém-criado no painel.
 */
export async function sendStaffAccessEmail(params: {
  email: string;
  password: string;
  loginUrl: string;
  language?: Language;
}): Promise<{ sent: true } | { sent: false; error: string }> {
  const provider = getEmailProvider();
  if (!provider) {
    return { sent: false, error: 'Nenhum provedor de e-mail configurado (SENDGRID_API_KEY ou RESEND_API_KEY)' };
  }

  const email = escapeHtml(params.email);
  const password = escapeHtml(params.password);
  const loginUrl = escapeHtml(params.loginUrl);
  const lang = params.language === 'es' ? 'es' : 'pt-BR';
  const subject =
    lang === 'es'
      ? 'Acceso al panel — Creators Summit 2026'
      : 'Acesso ao painel — Creators Summit 2026';
  const html =
    lang === 'es'
      ? `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
    .content { background: #f9fafb; padding: 30px; }
    .details { background: white; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .detail-row { padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
    .detail-label { font-weight: bold; color: #6b7280; }
    .footer { text-align: center; color: #6b7280; padding: 20px; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Creators Summit 2026</h1>
    </div>
    <div class="content">
      <h2>Su acceso al panel está listo</h2>
      <p>Se creó un usuario para que acceda al panel de administración.</p>
      <div class="details">
        <div class="detail-row">
          <span class="detail-label">URL de acceso:</span><br>
          <a href="${loginUrl}" style="color: #2563eb;">${loginUrl}</a>
        </div>
        <div class="detail-row">
          <span class="detail-label">Correo electrónico:</span> ${email}
        </div>
        <div class="detail-row" style="border-bottom: none;">
          <span class="detail-label">Contraseña:</span> ${password}
        </div>
      </div>
      <p style="text-align: center; margin: 24px 0;">
        <a href="${loginUrl}" style="display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">Abrir el panel</a>
      </p>
      <p style="font-size: 14px; color: #6b7280;">Por seguridad, le recomendamos cambiar la contraseña después del primer acceso.</p>
    </div>
    <div class="footer">
      <p>Este es un correo automático. Por favor, no responda.</p>
    </div>
  </div>
</body>
</html>
      `.trim()
      : `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
    .content { background: #f9fafb; padding: 30px; }
    .details { background: white; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .detail-row { padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
    .detail-label { font-weight: bold; color: #6b7280; }
    .footer { text-align: center; color: #6b7280; padding: 20px; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Creators Summit 2026</h1>
    </div>
    <div class="content">
      <h2>Seu acesso ao painel está pronto</h2>
      <p>Foi criado um usuário para você acessar o painel de administração.</p>
      <div class="details">
        <div class="detail-row">
          <span class="detail-label">URL de acesso:</span><br>
          <a href="${loginUrl}" style="color: #2563eb;">${loginUrl}</a>
        </div>
        <div class="detail-row">
          <span class="detail-label">E-mail:</span> ${email}
        </div>
        <div class="detail-row" style="border-bottom: none;">
          <span class="detail-label">Senha:</span> ${password}
        </div>
      </div>
      <p style="text-align: center; margin: 24px 0;">
        <a href="${loginUrl}" style="display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">Abrir o painel</a>
      </p>
      <p style="font-size: 14px; color: #6b7280;">Por segurança, recomendamos alterar a senha após o primeiro acesso.</p>
    </div>
    <div class="footer">
      <p>Este é um e-mail automático. Por favor, não responda.</p>
    </div>
  </div>
</body>
</html>
      `.trim();

  const from = getFromEmail(provider);
  if (provider === 'resend') {
    return sendViaResend(params.email, from, subject, html);
  }
  return sendViaSendGrid(params.email, from, subject, html);
}
