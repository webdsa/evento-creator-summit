/**
 * Exporta o Firestore (todas as coleções raiz e subcoleções) para um JSON local.
 *
 * Uso:
 *   npm run backup:firestore
 *   node scripts/backup-firestore.js --out backups/meu-dump.json
 *
 * Requer .env com: NEXT_PUBLIC_FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
 */

const path = require('path');
const fs = require('fs');
const admin = require('firebase-admin');

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

function parseArgs(argv) {
  const args = { out: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--out' && argv[i + 1]) {
      args.out = argv[++i];
    }
  }
  return args;
}

function serializeValue(value) {
  if (value === null || value === undefined) return value;
  if (value instanceof admin.firestore.Timestamp) {
    return { __type: 'timestamp', value: value.toDate().toISOString() };
  }
  if (value instanceof admin.firestore.GeoPoint) {
    return { __type: 'geopoint', latitude: value.latitude, longitude: value.longitude };
  }
  if (value instanceof admin.firestore.DocumentReference) {
    return { __type: 'reference', path: value.path };
  }
  if (Buffer.isBuffer(value) || value instanceof Uint8Array) {
    return { __type: 'bytes', value: Buffer.from(value).toString('base64') };
  }
  if (Array.isArray(value)) return value.map(serializeValue);
  if (typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = serializeValue(v);
    return out;
  }
  return value;
}

async function exportCollection(colRef) {
  const docs = [];
  const snap = await colRef.get();
  for (const doc of snap.docs) {
    const item = {
      id: doc.id,
      data: serializeValue(doc.data()),
    };
    const subs = await doc.ref.listCollections();
    if (subs.length > 0) {
      item.subcollections = {};
      for (const sub of subs) {
        item.subcollections[sub.id] = await exportCollection(sub);
      }
    }
    docs.push(item);
  }
  return docs;
}

async function main() {
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
  const args = parseArgs(process.argv.slice(2));
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outPath = path.resolve(
    args.out || path.join(__dirname, '..', 'backups', `firestore-${projectId}-${stamp}.json`)
  );

  console.log(`Exportando Firestore do projeto ${projectId}...`);
  const collections = {};
  const roots = await db.listCollections();
  let docCount = 0;
  for (const col of roots) {
    collections[col.id] = await exportCollection(col);
    docCount += collections[col.id].length;
    console.log(`  ${col.id}: ${collections[col.id].length} documento(s)`);
  }

  const payload = {
    exportedAt: new Date().toISOString(),
    projectId,
    collections,
  };

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2), 'utf8');
  console.log(`Backup salvo em ${outPath}`);
  console.log(`Coleções: ${roots.length} | documentos na raiz: ${docCount}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
