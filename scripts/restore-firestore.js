/**
 * Restaura um dump gerado por scripts/backup-firestore.js.
 *
 * Uso:
 *   npm run restore:firestore -- backups/firestore-....json --dry-run
 *   npm run restore:firestore -- backups/firestore-....json --yes
 *   npm run restore:firestore -- backups/firestore-....json --yes --wipe
 *
 * Sem --wipe: sobrescreve documentos presentes no dump; não apaga o restante.
 * Com --wipe: apaga cada coleção do dump no banco antes de gravar (irreversível).
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
  const args = { file: null, dryRun: false, yes: false, wipe: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry-run') args.dryRun = true;
    else if (a === '--yes') args.yes = true;
    else if (a === '--wipe') args.wipe = true;
    else if (!a.startsWith('-') && !args.file) args.file = a;
  }
  return args;
}

function deserializeValue(db, value) {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map((v) => deserializeValue(db, v));
  if (typeof value === 'object' && value.__type) {
    if (value.__type === 'timestamp') return admin.firestore.Timestamp.fromDate(new Date(value.value));
    if (value.__type === 'geopoint') return new admin.firestore.GeoPoint(value.latitude, value.longitude);
    if (value.__type === 'reference') return db.doc(value.path);
    if (value.__type === 'bytes') return Buffer.from(value.value, 'base64');
  }
  if (typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = deserializeValue(db, v);
    return out;
  }
  return value;
}

function countDocs(docs) {
  let n = 0;
  for (const doc of docs) {
    n += 1;
    if (doc.subcollections) {
      for (const subDocs of Object.values(doc.subcollections)) n += countDocs(subDocs);
    }
  }
  return n;
}

async function deleteQueryBatch(db, query) {
  const snap = await query.get();
  if (snap.empty) return 0;
  const batch = db.batch();
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
  return snap.size;
}

async function wipeCollection(db, colRef) {
  const snap = await colRef.get();
  for (const doc of snap.docs) {
    const subs = await doc.ref.listCollections();
    for (const sub of subs) await wipeCollection(db, sub);
  }
  while (true) {
    const deleted = await deleteQueryBatch(db, colRef.limit(400));
    if (deleted === 0) break;
  }
}

async function restoreDocs(db, colRef, docs, dryRun, writer) {
  for (const doc of docs) {
    const ref = colRef.doc(doc.id);
    const data = deserializeValue(db, doc.data || {});
    if (!dryRun) await writer.set(ref, data);
    if (doc.subcollections) {
      for (const [subId, subDocs] of Object.entries(doc.subcollections)) {
        await restoreDocs(db, ref.collection(subId), subDocs, dryRun, writer);
      }
    }
  }
}

function createBatchedWriter(db) {
  let batch = db.batch();
  let ops = 0;
  return {
    async set(ref, data) {
      batch.set(ref, data);
      ops += 1;
      if (ops >= 400) {
        await batch.commit();
        batch = db.batch();
        ops = 0;
      }
    },
    async flush() {
      if (ops > 0) {
        await batch.commit();
        batch = db.batch();
        ops = 0;
      }
    },
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.file) {
    console.error('Uso: node scripts/restore-firestore.js <arquivo.json> [--dry-run] [--yes] [--wipe]');
    process.exit(1);
  }

  const filePath = path.resolve(args.file);
  if (!fs.existsSync(filePath)) {
    console.error(`Arquivo não encontrado: ${filePath}`);
    process.exit(1);
  }

  const dump = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  if (!dump.collections || typeof dump.collections !== 'object') {
    console.error('JSON inválido: esperado objeto com "collections".');
    process.exit(1);
  }

  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    console.error('Erro: variáveis de ambiente ausentes.');
    console.error('Defina NEXT_PUBLIC_FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL e FIREBASE_PRIVATE_KEY no .env');
    process.exit(1);
  }

  const collectionNames = Object.keys(dump.collections);
  let total = 0;
  for (const name of collectionNames) total += countDocs(dump.collections[name]);

  console.log(`Dump: ${filePath}`);
  console.log(`Exportado em: ${dump.exportedAt || '?'} | projeto original: ${dump.projectId || '?'}`);
  console.log(`Destino atual: ${projectId}`);
  console.log(`Coleções: ${collectionNames.join(', ')}`);
  console.log(`Documentos (incluindo subcoleções): ${total}`);
  if (args.wipe) console.log('Modo --wipe: as coleções do dump serão apagadas no destino antes da gravação.');

  if (args.dryRun) {
    console.log('Dry-run: nenhum dado será alterado.');
    return;
  }

  if (!args.yes) {
    console.error('Recusa: passe --yes para gravar de fato (ou --dry-run para só inspecionar).');
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
  const writer = createBatchedWriter(db);

  for (const name of collectionNames) {
    const colRef = db.collection(name);
    if (args.wipe) {
      console.log(`Limpando ${name}...`);
      await wipeCollection(db, colRef);
    }
    console.log(`Restaurando ${name}...`);
    await restoreDocs(db, colRef, dump.collections[name], false, writer);
  }
  await writer.flush();
  console.log('Restore concluído.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
