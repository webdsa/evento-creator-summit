/**
 * Cria um usuário admin no Firebase (Authentication + Firestore admins).
 *
 * Uso:
 *   node scripts/create-admin.js
 *   node scripts/create-admin.js admin@exemplo.com MinhaSenha123
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

const auth = admin.auth();
const db = admin.firestore();

const EMAIL = process.argv[2] || 'admin@exemplo.com';
const PASSWORD = process.argv[3] || 'admin123';

async function createAdmin() {
  console.log('\nCriando usuário admin (Firebase)...');
  console.log('Email:', EMAIL);
  console.log('Senha:', PASSWORD);
  console.log('');

  try {
    let uid;

    try {
      const userRecord = await auth.createUser({
        email: EMAIL,
        password: PASSWORD,
        emailVerified: true,
      });
      uid = userRecord.uid;
      console.log('Usuário criado no Authentication:', uid);
    } catch (err) {
      if (err.code === 'auth/email-already-exists') {
        const userRecord = await auth.getUserByEmail(EMAIL);
        uid = userRecord.uid;
        console.log('Usuário já existe no Authentication:', uid);
      } else {
        throw err;
      }
    }

    const now = new Date().toISOString();
    await db.collection('admins').doc(uid).set({
      enabled: true,
      role: 'admin',
      created_at: now,
    }, { merge: true });

    console.log('Documento criado na coleção admins:', uid);
    console.log('\n✅ Admin configurado com sucesso!');
    console.log('\nCredenciais de acesso:');
    console.log('  Email:', EMAIL);
    console.log('  Senha:', PASSWORD);
    console.log('\nAcesse: /admin/login\n');
    process.exit(0);
  } catch (error) {
    console.error('Erro:', error.message || error);
    process.exit(1);
  }
}

createAdmin();
