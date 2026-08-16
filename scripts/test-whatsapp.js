/**
 * Testa o envio de mensagem WhatsApp via Unnichat (template).
 * Requisição: POST {base}/meta/templates
 *
 * Uso:
 *   node scripts/test-whatsapp.js <número>
 *   node scripts/test-whatsapp.js <número> <email> <código_inscricao>
 *
 * Exemplo:
 *   node scripts/test-whatsapp.js 61999998888
 *   node scripts/test-whatsapp.js 61999998888 eli.mendonca@adventistas.org ASASD
 *
 * Template: UNNICHAT_TEMPLATE_ID_PT (padrão) ou UNNICHAT_TEMPLATE_ID_ES com --es
 * 2 parâmetros: {{1}} = email, {{2}} = código da inscrição
 *
 * Requer .env: UNNICHAT_API_BASE_URL, UNNICHAT_API_KEY, UNNICHAT_TEMPLATE_ID_PT
 * Opcional: UNNICHAT_TEMPLATE_ID_ES, UNNICHAT_AUTH_HEADER=X-Api-Key (se não usar Bearer)
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

function normalizePhone(phone) {
  const digits = String(phone).replace(/\D/g, '').trim();
  if (!digits) return '';
  if (digits.length >= 12 || digits.startsWith('55')) return digits;
  if (digits.length === 11 && digits.startsWith('9')) return '55' + digits;
  if (digits.length === 10 && /^[2-5]/.test(digits)) return '55' + digits;
  return digits;
}

async function main() {
  const baseUrl = (process.env.UNNICHAT_API_BASE_URL || 'https://unnichat.com.br/api').replace(/\/$/, '');
  const apiKey = process.env.UNNICHAT_API_KEY?.trim();
  const authHeaderType = process.env.UNNICHAT_AUTH_HEADER?.trim().toLowerCase();

  if (!apiKey) {
    console.error('Erro: defina UNNICHAT_API_KEY no .env');
    process.exit(1);
  }

  const args = process.argv.slice(2).filter((a) => a !== '--es');
  const useEs = process.argv.includes('--es');
  const phoneArg = args[0];
  const emailArg = args[1];
  const inscricaoArg = args[2];

  if (!phoneArg) {
    console.error('Uso: node scripts/test-whatsapp.js <número> [email] [código_inscrição] [--es]\n');
    console.error('Exemplo: node scripts/test-whatsapp.js 61999998888');
    console.error('Exemplo: node scripts/test-whatsapp.js 61999998888 eli.mendonca@adventistas.org ASASD --es');
    process.exit(1);
  }

  const phone = normalizePhone(phoneArg);
  if (!phone) {
    console.error('Erro: número inválido');
    process.exit(1);
  }

  const templateEnv = useEs ? 'UNNICHAT_TEMPLATE_ID_ES' : 'UNNICHAT_TEMPLATE_ID_PT';
  const templateId = process.env[templateEnv]?.trim();
  if (!templateId) {
    console.error(`Erro: defina ${templateEnv} no .env`);
    process.exit(1);
  }
  const email = emailArg && emailArg.trim() ? emailArg.trim() : 'eli.mendonca@adventistas.org';
  const inscricao = inscricaoArg && inscricaoArg.trim() ? inscricaoArg.trim() : 'ASASD';

  const bodyParameters = [
    { text: email, type: 'text' },
    { text: inscricao, type: 'text' },
  ];

  const body = {
    phone,
    templateId,
    bodyParameters,
  };

  console.log('Método: POST');
  console.log('URL:', baseUrl + '/meta/templates');
  console.log('Enviando para:', phone);
  console.log('Template ID:', templateId);
  console.log('bodyParameters ({{1}}=email, {{2}}=inscrição):', bodyParameters.map((p) => p.text).join(' | '));
  console.log('');

  const headers = {
    'Content-Type': 'application/json',
  };
  if (authHeaderType === 'x-api-key') {
    headers['X-Api-Key'] = apiKey;
  } else {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  try {
    const res = await fetch(`${baseUrl}/meta/templates`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    const bodyText = await res.text();

    if (res.ok) {
      let json = null;
      try {
        json = bodyText ? JSON.parse(bodyText) : null;
      } catch {}
      if (json && json.success === false && json.message) {
        console.error('API retornou success: false –', json.message);
        if (bodyText) console.error('Resposta:', bodyText);
        if (/132000|number of parameters|params/i.test(bodyText || '')) {
          console.error('\nDica: Confira no WhatsApp Business se o template tem exatamente 2 variáveis ({{1}}, {{2}}).');
        }
        process.exit(1);
      }
      console.log('OK – Template enviado com sucesso.');
      if (bodyText) console.log('Resposta:', bodyText);
      return;
    }

    console.error('Falha:', res.status, res.statusText);
    if (bodyText) {
      try {
        const json = JSON.parse(bodyText);
        console.error('Detalhe:', json.message || json.error || JSON.stringify(json));
      } catch {
        console.error('Resposta:', bodyText.slice(0, 400));
      }
    }
    process.exit(1);
  } catch (err) {
    console.error('Erro:', err.message);
    process.exit(1);
  }
}

main();
