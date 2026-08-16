/**
 * Sincroniza todos os participantes (inscrições) com a plataforma Unichat:
 * - Cria as tags UNNICHAT_TAG_PT e UNNICHAT_TAG_ES no Unichat (se não existirem)
 * - Cria ou atualiza cada contato no Unichat com a tag conforme o idioma:
 *   pt-BR → UNNICHAT_TAG_PT, es → UNNICHAT_TAG_ES
 *
 * Uso:
 *   node scripts/sync-unichat-participants.js
 *   node scripts/sync-unichat-participants.js --dry-run   (só lista, não envia)
 *
 * Requer .env: UNNICHAT_API_BASE_URL, UNNICHAT_API_KEY, UNNICHAT_TAG_PT, UNNICHAT_TAG_ES,
 *   NEXT_PUBLIC_FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
 */

const path = require('path');
const fs = require('fs');

function loadEnvFile(fileName) {
  const root = path.resolve(__dirname, '..');
  const filePath = path.join(root, fileName);
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1).replace(/\\n/g, '\n');
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile('.env.local');
loadEnvFile('.env');

function getTagByLanguage(language) {
  const tag =
    language === 'es'
      ? process.env.UNNICHAT_TAG_ES?.trim()
      : process.env.UNNICHAT_TAG_PT?.trim();
  return tag || undefined;
}

function normalizePhone(phone) {
  const digits = String(phone || '').replace(/\D/g, '').trim();
  if (!digits) return '';
  if (digits.length >= 12 || digits.startsWith('55')) return digits;
  if (digits.length === 11 && digits.startsWith('9')) return '55' + digits;
  if (digits.length === 10 && /^[2-5]/.test(digits)) return '55' + digits;
  return digits;
}

function getUnnichatHeaders() {
  const apiKey = process.env.UNNICHAT_API_KEY?.trim() ?? '';
  const authHeaderType = process.env.UNNICHAT_AUTH_HEADER?.trim().toLowerCase();
  const headers = { 'Content-Type': 'application/json' };
  if (authHeaderType === 'x-api-key') {
    headers['X-Api-Key'] = apiKey;
  } else {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }
  return headers;
}

async function getOrCreateUnnichatTagId(baseUrl, tagName) {
  try {
    const searchRes = await fetch(`${baseUrl}/tags/search`, {
      method: 'POST',
      headers: getUnnichatHeaders(),
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
  try {
    const createRes = await fetch(`${baseUrl}/tags`, {
      method: 'POST',
      headers: getUnnichatHeaders(),
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

async function addTagToUnnichatContactByPhone(baseUrl, phone, tagId) {
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
    await fetch(`${baseUrl}/contact/${contactId}/tags`, {
      method: 'POST',
      headers: getUnnichatHeaders(),
      body: JSON.stringify({ tag_id: tagId }),
    });
  } catch (e) {
    console.warn('[Unnichat] addTagToContact:', e);
  }
}

async function createUnnichatContact(baseUrl, { phone, fullName, email, language }) {
  const normalized = normalizePhone(phone);
  if (!normalized) return { ok: false, error: 'Número inválido' };
  const lang = language === 'es' ? 'es' : 'pt-BR';
  const tagName = getTagByLanguage(lang);
  const tagId = tagName ? await getOrCreateUnnichatTagId(baseUrl, tagName) : null;
  const body = {
    phone: normalized,
    name: (fullName || '').trim() || 'Contato',
  };
  if (email && String(email).trim()) body.email = String(email).trim();
  if (tagId) body.tags = [tagId];
  try {
    const res = await fetch(`${baseUrl}/contact`, {
      method: 'POST',
      headers: getUnnichatHeaders(),
      body: JSON.stringify(body),
    });
    if (res.ok) return { ok: true };
    const bodyText = await res.text();
    const alreadyExists = res.status === 409 || /já existe|already exists|duplicate|duplicad/i.test(bodyText);
    if (alreadyExists && tagId) {
      await addTagToUnnichatContactByPhone(baseUrl, normalized, tagId);
      return { ok: true };
    }
    if (alreadyExists) return { ok: true };
    return { ok: false, error: bodyText.slice(0, 200) };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const baseUrl = (process.env.UNNICHAT_API_BASE_URL || 'https://unnichat.com.br/api').replace(/\/$/, '');
  const apiKey = process.env.UNNICHAT_API_KEY?.trim();
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!apiKey) {
    console.error('Erro: defina UNNICHAT_API_KEY no .env');
    process.exit(1);
  }
  const tagPt = getTagByLanguage('pt-BR');
  const tagEs = getTagByLanguage('es');
  if (!tagPt || !tagEs) {
    console.error('Erro: defina UNNICHAT_TAG_PT e UNNICHAT_TAG_ES no .env');
    process.exit(1);
  }
  if (!projectId || !clientEmail || !privateKey) {
    console.error('Erro: defina NEXT_PUBLIC_FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL e FIREBASE_PRIVATE_KEY no .env');
    process.exit(1);
  }

  const admin = require('firebase-admin');
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
    });
  }
  const db = admin.firestore();

  const COLL = { registrations: 'registrations' };
  const snap = await db.collection(COLL.registrations).orderBy('created_at', 'desc').get();
  const registrations = snap.docs
    .filter((d) => d.id !== '_init')
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((r) => r.phone && (r.language === 'pt-BR' || r.language === 'es'));

  console.log(`Tags no Unichat: ${tagPt} (pt-BR), ${tagEs} (es)\n`);
  console.log('Total de inscrições com telefone e idioma válido:', registrations.length);
  if (registrations.length === 0) {
    console.log('Nada a sincronizar.');
    process.exit(0);
  }

  if (dryRun) {
    console.log('\n[--dry-run] Seriam sincronizados:\n');
    registrations.forEach((r, i) => {
      const tag = getTagByLanguage(r.language === 'es' ? 'es' : 'pt-BR');
      console.log(`  ${i + 1}. ${r.full_name} | ${r.phone} | ${r.language} → ${tag}`);
    });
    console.log('\nExecute sem --dry-run para enviar ao Unichat.');
    process.exit(0);
  }

  let ok = 0;
  let fail = 0;
  for (let i = 0; i < registrations.length; i++) {
    const r = registrations[i];
    const tag = getTagByLanguage(r.language === 'es' ? 'es' : 'pt-BR');
    const result = await createUnnichatContact(baseUrl, {
      phone: r.phone,
      fullName: r.full_name,
      email: r.email,
      language: r.language,
    });
    if (result.ok) {
      ok++;
      console.log(`[${i + 1}/${registrations.length}] OK ${r.phone} → ${tag}`);
    } else {
      fail++;
      console.error(`[${i + 1}/${registrations.length}] ERRO ${r.phone}: ${result.error}`);
    }
    await new Promise((r) => setTimeout(r, 200));
  }

  console.log('\nConcluído. OK:', ok, 'Erros:', fail);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
