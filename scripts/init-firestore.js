/**
 * Inicializa a estrutura do Firestore para o app Eventos.
 * - Cria o documento do contador de inscrições (counters/registration_code) se não existir.
 * - Opcionalmente cria dados de exemplo (uma instituição e um voucher) com --seed.
 *
 * Uso:
 *   node scripts/init-firestore.js
 *   node scripts/init-firestore.js --seed
 *
 * Requer .env com: NEXT_PUBLIC_FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
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

const admin = require('firebase-admin');

const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

if (!projectId || !clientEmail || !privateKey) {
  console.error('Erro: variáveis de ambiente ausentes.');
  console.error('Defina NEXT_PUBLIC_FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL e FIREBASE_PRIVATE_KEY no .env');
  process.exit(1);
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });
}

const db = admin.firestore();

const COLL = {
  institutions: 'institutions',
  vouchers: 'vouchers',
  voucherCodes: 'voucher_codes',
  registrations: 'registrations',
  emailIndex: 'email_index',
  admins: 'admins',
  counters: 'counters',
};

async function initCollections() {
  const now = new Date().toISOString();
  const registrationsRef = db.collection(COLL.registrations).doc('_init');
  if (!(await registrationsRef.get()).exists) {
    await registrationsRef.set({
      _placeholder: true,
      registration_code: '_init',
      created_at: now,
    });
    console.log('Criada coleção: registrations (documento _init para exibir no Console)');
  } else {
    console.log('Coleção registrations já existe.');
  }
}

async function initAdminsCollection() {
  const adminsRef = db.collection(COLL.admins).doc('_init');
  if (!(await adminsRef.get()).exists) {
    await adminsRef.set({
      _placeholder: true,
      enabled: false,
      created_at: new Date().toISOString(),
    });
    console.log('Criada coleção: admins (documento _init para exibir no Console)');
  } else {
    console.log('Coleção admins já existe.');
  }
}

async function initCounter() {
  const ref = db.collection(COLL.counters).doc('registration_code');
  const snap = await ref.get();
  if (snap.exists) {
    console.log('Contador de inscrições já existe (value = %s)', snap.data().value);
    return;
  }
  await ref.set({ value: 0 });
  console.log('Criado: counters/registration_code com value = 0');
}

async function seedSample() {
  const instRef = db.collection(COLL.institutions).doc();
  const now = new Date().toISOString();
  await instRef.set({
    name: 'Instituição Exemplo',
    group: 1,
    quota_total: 50,
    used_count: 0,
    status: 'active',
    created_at: now,
    updated_at: now,
  });
  console.log('Criado: institutions/%s (Instituição Exemplo)', instRef.id);

  const code = 'TESTE-01';
  const voucherRef = db.collection(COLL.vouchers).doc();
  await voucherRef.set({
    code,
    institution_id: instRef.id,
    quota_total: 50,
    used_count: 0,
    status: 'active',
    expires_at: null,
    created_at: now,
    updated_at: now,
  });
  console.log('Criado: vouchers/%s (code = %s)', voucherRef.id, code);

  await db.collection(COLL.voucherCodes).doc(code).set({
    voucherId: voucherRef.id,
    created_at: now,
  });
  console.log('Criado: voucher_codes/%s -> voucherId = %s', code, voucherRef.id);

  console.log('\nLink de teste: /inscricao?code=TESTE-01');
}

async function main() {
  const seed = process.argv.includes('--seed');
  console.log('Inicializando Firestore...\n');

  await initCounter();
  await initCollections();
  await initAdminsCollection();
  if (seed) {
    console.log('');
    await seedSample();
  }

  console.log('\nConcluído.');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
