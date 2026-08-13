import { createClient } from 'npm:@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface Registration {
  id: string;
  registration_code: string;
  full_name: string;
  email: string;
  phone: string;
  gender?: string;
  shirt_size?: string;
  role?: string;
  language: 'pt-BR' | 'es';
  confirmation_email_sent_at: string | null;
  institution_id: string;
}

interface Institution {
  name: string;
}

const emailTemplates = {
  'pt-BR': {
    subject: 'Inscrição confirmada — Creators Summit 2026',
    getBody: (registration: Registration, institutionName: string) => `
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
        ${registration.gender ? `<div class="detail-row"><span class="detail-label">Gênero:</span> ${registration.gender}</div>` : ''}
        ${registration.shirt_size ? `<div class="detail-row"><span class="detail-label">Tamanho da Camiseta:</span> ${registration.shirt_size}</div>` : ''}
        ${registration.role ? `<div class="detail-row"><span class="detail-label">Função:</span> ${registration.role}</div>` : ''}
        <div class="detail-row">
          <span class="detail-label">Instituição:</span> ${institutionName}
        </div>
      </div>

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
    `,
  },
  'es': {
    subject: 'Inscripción confirmada — Creators Summit 2026',
    getBody: (registration: Registration, institutionName: string) => `
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
        ${registration.gender ? `<div class="detail-row"><span class="detail-label">Género:</span> ${registration.gender}</div>` : ''}
        ${registration.shirt_size ? `<div class="detail-row"><span class="detail-label">Talla de Camiseta:</span> ${registration.shirt_size}</div>` : ''}
        ${registration.role ? `<div class="detail-row"><span class="detail-label">Función:</span> ${registration.role}</div>` : ''}
        <div class="detail-row">
          <span class="detail-label">Institución:</span> ${institutionName}
        </div>
      </div>

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
    `,
  },
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: registrations, error: fetchError } = await supabase
      .from('registrations')
      .select(`
        id,
        registration_code,
        full_name,
        email,
        phone,
        language,
        confirmation_email_sent_at,
        institution:institutions(name)
      `)
      .eq('status', 'confirmed')
      .is('confirmation_email_sent_at', null)
      .limit(10);

    if (fetchError) {
      console.error('Error fetching registrations:', fetchError);
      throw fetchError;
    }

    if (!registrations || registrations.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No pending emails', processed: 0 }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    let processed = 0;
    let failed = 0;

    for (const registration of registrations) {
      try {
        const institution = Array.isArray(registration.institution)
          ? registration.institution[0]
          : registration.institution;

        const template = emailTemplates[registration.language];
        const subject = template.subject;
        const body = template.getBody(registration, institution.name);

        console.log('='.repeat(80));
        console.log('SENDING CONFIRMATION EMAIL');
        console.log('='.repeat(80));
        console.log('To:', registration.email);
        console.log('Subject:', subject);
        console.log('Language:', registration.language);
        console.log('Registration Code:', registration.registration_code);
        console.log('Institution:', institution.name);
        console.log('-'.repeat(80));
        console.log('Body (HTML):', body);
        console.log('='.repeat(80));

        const { error: updateError } = await supabase
          .from('registrations')
          .update({
            confirmation_email_sent_at: new Date().toISOString(),
            confirmation_email_last_error: null,
          })
          .eq('id', registration.id);

        if (updateError) {
          console.error('Error updating registration:', updateError);
          throw updateError;
        }

        processed++;
      } catch (emailError) {
        console.error('Error sending email for registration:', registration.id, emailError);

        await supabase
          .from('registrations')
          .update({
            confirmation_email_last_error: String(emailError),
          })
          .eq('id', registration.id);

        failed++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed,
        failed,
        total: registrations.length,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: String(error),
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
