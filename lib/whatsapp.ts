/**
 * Envio de mensagens WhatsApp via Unnichat.
 * https://unnichat.com.br/api/api-docs/
 * Configure UNNICHAT_API_BASE_URL e UNNICHAT_API_KEY no .env.
 */

export type Language = 'pt-BR' | 'es';

export interface SendRegistrationWhatsAppParams {
  phone: string;
  email: string;
  registrationCode: string;
  language: Language;
  statusUrl: string;
  /** Nome completo do inscrito */
  fullName?: string;
  /** Nome da instituição */
  institutionName?: string;
  /** Função/cargo */
  role?: string;
  /** Gênero */
  gender?: string;
}

/** Template IDs aprovados no WhatsApp (Unichat): {{1}} = email, {{2}} = código da inscrição */
const TEMPLATE_IDS: Record<Language, string> = {
  'pt-BR': '959492029749455',
  es: '921690590224843',
};

/**
 * Normaliza o telefone para E.164 (apenas dígitos, com código do país).
 * Números brasileiros sem código (10–11 dígitos) ganham prefixo 55.
 */
function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '').trim();
  if (!digits) return '';
  // Já tem código de país (12+ dígitos ou começa com 55)
  if (digits.length >= 12 || digits.startsWith('55')) return digits;
  // Brasil: celular 9 dígitos (9xxxx-xxxx) ou 11 dígitos com DDD (11 9xxxx-xxxx)
  if (digits.length === 11 && digits.startsWith('9')) return '55' + digits;
  if (digits.length === 10 && /^[2-5]/.test(digits)) return '55' + digits;
  return digits;
}

function isUnnichatConfigured(): boolean {
  const base = process.env.UNNICHAT_API_BASE_URL?.trim();
  const key = process.env.UNNICHAT_API_KEY?.trim();
  return !!(base && key);
}

function getUnnichatHeaders(): Record<string, string> {
  const apiKey = process.env.UNNICHAT_API_KEY?.trim() ?? '';
  const authHeaderType = process.env.UNNICHAT_AUTH_HEADER?.trim().toLowerCase();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (authHeaderType === 'x-api-key') {
    headers['X-Api-Key'] = apiKey;
  } else {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }
  return headers;
}

/** Tags por idioma no Unnichat: MidiaTecPT (pt-BR) e MidiaTecES (español). */
export const UNNICHAT_TAG_BY_LANGUAGE: Record<Language, string> = {
  'pt-BR': 'MidiaTecPT',
  es: 'MidiaTecES',
};

/**
 * Obtém o ID de uma tag no Unnichat por nome (busca ou cria). A API usa tag_id, não nome.
 */
async function getOrCreateUnnichatTagId(tagName: string): Promise<string | null> {
  const baseUrl = (process.env.UNNICHAT_API_BASE_URL ?? 'https://unnichat.com.br/api').trim().replace(/\/$/, '');
  const headers = getUnnichatHeaders();

  // Buscar tag por nome (POST /tags/search, type: contact)
  try {
    const searchRes = await fetch(`${baseUrl}/tags/search`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ type: 'contact', name: tagName }),
    });
    if (searchRes.ok) {
      const data = await searchRes.json();
      const id = Array.isArray(data) ? data[0]?.id : data?.id ?? data?.data?.[0]?.id ?? data?.data?.id;
      if (id && typeof id === 'string') return id;
    }
  } catch (e) {
    console.warn('[Unnichat] Tag search failed:', e);
  }

  // Criar tag se não existir (POST /tags)
  try {
    const createRes = await fetch(`${baseUrl}/tags`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ name: tagName, type: 'contact' }),
    });
    if (createRes.ok) {
      const data = await createRes.json();
      const id = data?.id ?? data?.data?.id;
      if (id && typeof id === 'string') return id;
    }
  } catch (e) {
    console.warn('[Unnichat] Tag create failed:', e);
  }
  return null;
}

/**
 * Busca contato por telefone (POST /contact/search) e adiciona a tag (POST /contact/{id}/tags).
 */
async function addTagToUnnichatContactByPhone(
  baseUrl: string,
  phone: string,
  tagId: string
): Promise<void> {
  try {
    const searchRes = await fetch(`${baseUrl}/contact/search`, {
      method: 'POST',
      headers: getUnnichatHeaders(),
      body: JSON.stringify({ phone }),
    });
    if (!searchRes.ok) return;
    const searchData = await searchRes.json();
    const contactId = searchData?.id ?? searchData?.data?.id ?? searchData?.[0]?.id;
    if (!contactId || typeof contactId !== 'string') return;
    const tagRes = await fetch(`${baseUrl}/contact/${contactId}/tags`, {
      method: 'POST',
      headers: getUnnichatHeaders(),
      body: JSON.stringify({ tag_id: tagId }),
    });
    if (!tagRes.ok) {
      console.warn('[Unnichat] Add tag to contact failed:', tagRes.status);
    }
  } catch (e) {
    console.warn('[Unnichat] addTagToUnnichatContactByPhone:', e);
  }
}

/**
 * Cria um contato no Unnichat (POST /contact). Útil antes de enviar mensagem.
 * Associa a tag por idioma: pt-BR → MidiaTecPT, es → MidiaTecES.
 * Retorna { created: true } em sucesso; { created: false, error } em falha.
 * Se o contato já existir (ex.: 409), trata como sucesso e adiciona a tag se faltar.
 */
export async function createUnnichatContact(params: {
  phone: string;
  fullName: string;
  email?: string;
  /** Idioma do cadastro: define a tag MidiaTecPT ou MidiaTecES. Default: pt-BR. */
  language?: Language;
}): Promise<{ created: boolean; error?: string }> {
  if (!isUnnichatConfigured()) {
    return { created: false, error: 'Unnichat não configurado' };
  }
  const phone = normalizePhone(params.phone);
  if (!phone) {
    return { created: false, error: 'Número de telefone inválido' };
  }

  const language = params.language === 'es' ? 'es' : 'pt-BR';
  const tagName = UNNICHAT_TAG_BY_LANGUAGE[language];
  const tagId = await getOrCreateUnnichatTagId(tagName);

  const baseUrl = (process.env.UNNICHAT_API_BASE_URL ?? 'https://unnichat.com.br/api').trim().replace(/\/$/, '');
  const url = `${baseUrl}/contact`;
  const body: Record<string, string | string[]> = {
    phone,
    name: params.fullName.trim() || 'Contato',
  };
  if (params.email?.trim()) body.email = params.email.trim();
  if (tagId) body.tags = [tagId];

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: getUnnichatHeaders(),
      body: JSON.stringify(body),
    });

    if (res.ok) {
      return { created: true };
    }
    const bodyText = await res.text();
    const alreadyExists = res.status === 409 || /já existe|already exists|duplicate|duplicad/i.test(bodyText);
    if (alreadyExists && tagId) {
      await addTagToUnnichatContactByPhone(baseUrl, phone, tagId);
      return { created: true };
    }
    if (alreadyExists) {
      return { created: true };
    }
    let errMsg = `Unnichat contact ${res.status}`;
    try {
      const json = JSON.parse(bodyText);
      if (json.message) errMsg = json.message;
      else if (json.error) errMsg = json.error;
    } catch {
      if (bodyText) errMsg = bodyText.slice(0, 200);
    }
    console.warn('[Unnichat] Create contact failed:', errMsg);
    return { created: false, error: errMsg };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn('[Unnichat] Create contact error:', message);
    return { created: false, error: message };
  }
}

const baseUnnichatUrl = () =>
  (process.env.UNNICHAT_API_BASE_URL ?? 'https://unnichat.com.br/api').trim().replace(/\/$/, '');

/**
 * Envia mensagem de template WhatsApp via Unnichat (POST /meta/templates).
 * Variáveis do template: {{1}} = email do participante, {{2}} = código da inscrição.
 */
async function sendTemplateViaUnnichat(
  phone: string,
  templateId: string,
  variables: { email: string; registrationCode: string }
): Promise<{ sent: boolean; error?: string }> {
  const apiKey = process.env.UNNICHAT_API_KEY?.trim();
  if (!apiKey) {
    return { sent: false, error: 'Unnichat: UNNICHAT_API_KEY não configurada' };
  }
  const url = `${baseUnnichatUrl()}/meta/templates`;
  const body = {
    phone,
    templateId,
    bodyParameters: [
      { text: variables.email, type: 'text' },
      { text: variables.registrationCode, type: 'text' },
    ],
  };
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: getUnnichatHeaders(),
      body: JSON.stringify(body),
    });
    const bodyText = await res.text();
    let json: { success?: boolean; code?: string; message?: string; error?: string } | null = null;
    try {
      json = bodyText ? JSON.parse(bodyText) : null;
    } catch {
      // ignore
    }

    const apiSuccess = json?.success === true;
    const apiError = json?.message ?? json?.error;

    if (!res.ok) {
      const errMsg = apiError ?? `Unnichat ${res.status}`;
      if (bodyText && bodyText.length < 500) console.error('[WhatsApp] Unnichat template response:', bodyText);
      console.error('[WhatsApp] Unnichat template error:', res.status, errMsg, 'phone:', phone);
      return { sent: false, error: errMsg };
    }

    if (apiSuccess === false && apiError) {
      console.error('[WhatsApp] Unnichat template API returned success:false', bodyText, 'phone:', phone);
      return { sent: false, error: apiError };
    }

    if (process.env.NODE_ENV === 'development' && bodyText) {
      console.log('[WhatsApp] Unnichat template sent OK', { phone, templateId, response: bodyText.slice(0, 200) });
    }
    return { sent: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[WhatsApp] Unnichat template send failed:', message);
    return { sent: false, error: message };
  }
}

/**
 * Envia mensagem de confirmação de inscrição por WhatsApp via Unnichat (template).
 * Usa template por idioma: pt-BR → 959492029749455, es → 921690590224843.
 * Variáveis no template: {{1}} = email do participante, {{2}} = código da inscrição.
 * Retorna { sent: true } em sucesso ou { sent: false, error: string } em falha.
 */
export async function sendRegistrationWhatsApp(
  params: SendRegistrationWhatsAppParams
): Promise<{ sent: boolean; error?: string }> {
  if (!isUnnichatConfigured()) {
    return { sent: false, error: 'WhatsApp não configurado (configure UNNICHAT_API_BASE_URL e UNNICHAT_API_KEY no .env)' };
  }

  const number = normalizePhone(params.phone);
  if (!number) {
    return { sent: false, error: 'Número de telefone inválido' };
  }

  const templateId = TEMPLATE_IDS[params.language];
  return sendTemplateViaUnnichat(number, templateId, {
    email: params.email,
    registrationCode: params.registrationCode,
  });
}
