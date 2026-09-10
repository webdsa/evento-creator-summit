/**
 * Compara inscritos do Firestore com uma planilha XLS/XLSX/CSV.
 * Não altera dados: só lista diferenças, linhas sem match e inscritos que não estão na planilha.
 *
 * Uso:
 *   node scripts/compare-registrations-spreadsheet.js --file planilha.xlsx
 *   node scripts/compare-registrations-spreadsheet.js --file planilha.xlsx --backup backups/dump.json
 *   node scripts/compare-registrations-spreadsheet.js --file planilha.xlsx --out report.json --csv diffs.csv
 *
 * Colunas reconhecidas (cabeçalho, qualquer caixa):
 *   influencer / influenciador
 *   arroba / instagram / link
 *   nicho / conteudo
 *   uniao / instituicao
 *   email
 *   telefone / whatsapp
 *
 * Requer .env (se não usar --backup): NEXT_PUBLIC_FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
 */

const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');

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

const SKIP_TOKENS = new Set([
  'de', 'da', 'do', 'das', 'dos', 'del', 'la', 'las', 'los', 'le', 'van', 'von', 'y', 'e', 'di', 'jr', 'junior', 'filho', 'neto',
]);

const HEADER_ALIASES = {
  influencer: ['influencer', 'influenciador'],
  arroba: ['arroba', 'link ou', 'link', 'handle', 'instagram'],
  nicho: ['nicho principal', 'nicho', 'conteudo', 'contenido'],
  uniao: ['uniao', 'union', 'instituicao', 'institucion'],
  email: ['email', 'e mail', 'correo'],
  phone: ['telefone', 'phone', 'whatsapp', 'celular'],
};

const MATCH_THRESHOLD = 68;
const AMBIGUOUS_GAP = 8;

function parseArgs(argv) {
  const args = { file: null, backup: null, out: null, csv: null, sheet: null, all: false, onlyInDb: false, help: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--file' && argv[i + 1]) args.file = argv[++i];
    else if (a === '--backup' && argv[i + 1]) args.backup = argv[++i];
    else if (a === '--out' && argv[i + 1]) args.out = argv[++i];
    else if (a === '--csv' && argv[i + 1]) args.csv = argv[++i];
    else if (a === '--sheet' && argv[i + 1]) args.sheet = argv[++i];
    else if (a === '--all') args.all = true;
    else if (a === '--only-in-db') args.onlyInDb = true;
    else if (a === '--help' || a === '-h') args.help = true;
  }
  return args;
}

function normalizePersonName(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function significantTokens(value) {
  return normalizePersonName(value)
    .split(' ')
    .filter((t) => t.length > 1 && !SKIP_TOKENS.has(t));
}

function formatBadgeName(raw) {
  const parts = String(raw || '')
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .filter(Boolean);
  if (parts.length === 0) return '';
  let chosen = parts;
  if (parts.length === 2) chosen = [parts[0], parts[parts.length - 1]];
  else if (parts.length > 2) chosen = [parts[0], parts[1], parts[parts.length - 1]];
  let result = chosen.join(' ');
  if (result.length > 28 && chosen.length > 2) {
    result = [chosen[0], chosen[chosen.length - 1]].join(' ');
  }
  return result;
}

function normalizeLinkOrHandle(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed.slice(0, 300);
  const handle = trimmed.replace(/\s+/g, '').replace(/^@+/, '');
  if (!handle) return '';
  return `@${handle}`.slice(0, 100);
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizePhone(value) {
  return String(value || '').replace(/\D/g, '');
}

function scoreNameMatch(influencer, registration) {
  const inf = normalizePersonName(influencer);
  if (!inf) return 0;
  const full = normalizePersonName(registration.full_name);
  const cracha = normalizePersonName(registration.cracha);
  const badgeFromFull = normalizePersonName(formatBadgeName(registration.full_name));
  const badgeFromInf = normalizePersonName(formatBadgeName(influencer));

  if (inf === full) return 100;
  if (cracha && inf === cracha) return 96;
  if (badgeFromFull && inf === badgeFromFull) return 94;
  if (cracha && badgeFromInf === cracha) return 92;

  const infTokens = significantTokens(influencer);
  const fullTokens = significantTokens(registration.full_name);
  if (infTokens.length === 0 || fullTokens.length === 0) return 0;
  if (infTokens.join(' ') === fullTokens.join(' ')) return 88;

  const first = infTokens[0];
  const last = infTokens[infTokens.length - 1];
  const firstInFull = fullTokens.includes(first);
  const lastInFull = fullTokens.includes(last);
  if (firstInFull && lastInFull) {
    const overlap = infTokens.filter((t) => fullTokens.includes(t)).length;
    return Math.min(86, 68 + overlap * 4);
  }
  if (infTokens.length >= 2 && fullTokens[0] === first && fullTokens[fullTokens.length - 1] === last) {
    return 80;
  }
  return 0;
}

function expandMergedCells(sheet) {
  const merges = sheet['!merges'];
  if (!Array.isArray(merges)) return;
  for (const range of merges) {
    const origin = sheet[XLSX.utils.encode_cell({ r: range.s.r, c: range.s.c })];
    if (!origin) continue;
    for (let r = range.s.r; r <= range.e.r; r++) {
      for (let c = range.s.c; c <= range.e.c; c++) {
        if (r === range.s.r && c === range.s.c) continue;
        sheet[XLSX.utils.encode_cell({ r, c })] = { ...origin };
      }
    }
  }
}

function mapSpreadsheetObjectRow(raw, rowNumber) {
  const entries = Object.entries(raw).map(([key, value]) => [
    normalizePersonName(String(key)),
    value == null ? '' : String(value).trim(),
  ]);

  const pick = (field) => {
    const aliases = HEADER_ALIASES[field];
    for (const [header, value] of entries) {
      if (aliases.some((alias) => header === alias || header.startsWith(alias))) {
        return value;
      }
    }
    return '';
  };

  return {
    rowNumber,
    influencer: pick('influencer'),
    arroba: pick('arroba'),
    nicho: pick('nicho'),
    uniao: pick('uniao'),
    email: pick('email'),
    phone: pick('phone'),
  };
}

function readSpreadsheet(filePath, sheetName) {
  const buffer = fs.readFileSync(filePath);
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const name = sheetName || wb.SheetNames[0];
  const sheet = wb.Sheets[name];
  if (!sheet) {
    throw new Error(`Aba não encontrada: ${name}. Abas: ${wb.SheetNames.join(', ')}`);
  }
  expandMergedCells(sheet);
  const json = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  const rows = json.map((raw, index) => mapSpreadsheetObjectRow(raw, index + 2)).filter((row) => {
    return row.influencer || row.email || row.arroba;
  });
  return { sheetName: name, sheetNames: wb.SheetNames, rows };
}

function fromBackup(backupPath, includeCanceled) {
  const payload = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
  const registrations = (payload.collections?.registrations || [])
    .filter((d) => d.id !== '_init')
    .map((d) => ({ id: d.id, ...(d.data || {}) }))
    .filter((r) => includeCanceled || r.status !== 'canceled');
  const institutions = (payload.collections?.institutions || []).map((d) => ({
    id: d.id,
    name: d.data?.name || '',
  }));
  return { registrations, institutions };
}

async function fromFirestore(includeCanceled) {
  const admin = require('firebase-admin');
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      'Defina NEXT_PUBLIC_FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL e FIREBASE_PRIVATE_KEY no .env, ou use --backup.'
    );
  }
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
    });
  }
  const db = admin.firestore();
  const [regSnap, instSnap] = await Promise.all([
    db.collection('registrations').get(),
    db.collection('institutions').get(),
  ]);
  const institutions = instSnap.docs
    .filter((d) => d.id !== '_init')
    .map((d) => ({ id: d.id, name: d.data().name || '' }));
  const instMap = new Map(institutions.map((i) => [i.id, i.name]));
  const registrations = regSnap.docs
    .filter((d) => d.id !== '_init')
    .map((d) => {
      const data = d.data();
      return {
        id: d.id,
        ...data,
        institution_name: data.institution_name || instMap.get(data.institution_id) || '',
      };
    })
    .filter((r) => includeCanceled || r.status !== 'canceled');
  return { registrations, institutions };
}

function matchRow(row, registrations) {
  const email = normalizeEmail(row.email);
  if (email) {
    const byEmail = registrations.filter((r) => normalizeEmail(r.email) === email);
    if (byEmail.length === 1) {
      return { kind: 'match', registration: byEmail[0], score: 100, via: 'email' };
    }
    if (byEmail.length > 1) {
      return {
        kind: 'ambiguous',
        candidates: byEmail.map((r) => ({ id: r.id, full_name: r.full_name, score: 100 })),
      };
    }
  }

  const scored = registrations
    .map((reg) => ({ reg, score: scoreNameMatch(row.influencer, reg) }))
    .filter((item) => item.score >= MATCH_THRESHOLD)
    .sort((a, b) => b.score - a.score || (a.reg.status === 'confirmed' ? -1 : 1));

  if (scored.length === 0) return { kind: 'unmatched' };

  const confirmedBest = scored.filter((s) => s.reg.status === 'confirmed');
  const pool = confirmedBest.length > 0 ? confirmedBest : scored;
  const top = pool[0];
  const runnerUp = pool[1];
  if (runnerUp && top.score - runnerUp.score < AMBIGUOUS_GAP && top.reg.id !== runnerUp.reg.id) {
    return {
      kind: 'ambiguous',
      candidates: pool.slice(0, 4).map((s) => ({ id: s.reg.id, full_name: s.reg.full_name, score: s.score })),
    };
  }
  return { kind: 'match', registration: top.reg, score: top.score, via: 'name' };
}

function institutionComparable(uniao, registration, institutions) {
  const instName = registration.institution_name || '';
  const uniaoNorm = normalizePersonName(String(uniao || '').replace(/\b(uniao|union)\b/gi, ' '));
  const instNorm = normalizePersonName(String(instName).replace(/\b(uniao|union)\b/gi, ' '));
  if (!uniaoNorm) return { xls: uniao, db: instName, same: true };
  if (uniaoNorm === instNorm) return { xls: uniao, db: instName, same: true };
  if (instNorm && (instNorm.includes(uniaoNorm) || uniaoNorm.includes(instNorm))) {
    return { xls: uniao, db: instName, same: true };
  }
  const matched = institutions.find((inst) => {
    const name = normalizePersonName(String(inst.name || '').replace(/\b(uniao|union)\b/gi, ' '));
    return name && (name === uniaoNorm || name.includes(uniaoNorm) || uniaoNorm.includes(name));
  });
  if (matched && matched.id === registration.institution_id) {
    return { xls: uniao, db: instName, same: true };
  }
  return { xls: uniao, db: instName, same: uniaoNorm === instNorm };
}

function fieldDiff(field, xlsValue, dbValue, equal) {
  const xls = xlsValue == null ? '' : String(xlsValue);
  const db = dbValue == null ? '' : String(dbValue);
  if (equal(xls, db)) return null;
  if (!xls.trim() && !String(db).trim()) return null;
  if (!xls.trim()) return null;
  return { field, xls, db };
}

function compareMatched(row, registration, institutions) {
  const diffs = [];
  const nameDiff = fieldDiff(
    'nome',
    row.influencer,
    registration.full_name,
    (a, b) => normalizePersonName(a) === normalizePersonName(b)
  );
  if (nameDiff) diffs.push(nameDiff);

  const handleDiff = fieldDiff(
    'arroba',
    normalizeLinkOrHandle(row.arroba) || row.arroba,
    registration.link_or_handle || '',
    (a, b) => normalizeLinkOrHandle(a).toLowerCase() === normalizeLinkOrHandle(b).toLowerCase()
  );
  if (handleDiff) diffs.push(handleDiff);

  const nichoDiff = fieldDiff(
    'nicho',
    row.nicho,
    registration.conteudo || '',
    (a, b) => normalizePersonName(a) === normalizePersonName(b)
  );
  if (nichoDiff) diffs.push(nichoDiff);

  const emailDiff = fieldDiff(
    'email',
    row.email,
    registration.email || '',
    (a, b) => normalizeEmail(a) === normalizeEmail(b)
  );
  if (emailDiff) diffs.push(emailDiff);

  const phoneDiff = fieldDiff(
    'telefone',
    row.phone,
    registration.phone || '',
    (a, b) => {
      const da = normalizePhone(a);
      const db = normalizePhone(b);
      if (!da) return true;
      return da === db || db.endsWith(da) || da.endsWith(db);
    }
  );
  if (phoneDiff) diffs.push(phoneDiff);

  if (row.uniao.trim()) {
    const inst = institutionComparable(row.uniao, registration, institutions);
    if (!inst.same) diffs.push({ field: 'instituicao', xls: inst.xls, db: inst.db });
  }

  return diffs;
}

function csvEscape(value) {
  const s = String(value ?? '');
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function printHelp() {
  console.log(`Uso:
  node scripts/compare-registrations-spreadsheet.js --file planilha.xlsx
  node scripts/compare-registrations-spreadsheet.js --file planilha.xlsx --backup backups/dump.json
  node scripts/compare-registrations-spreadsheet.js --file planilha.xlsx --out report.json --csv diffs.csv

Opções:
  --file     Caminho do XLS/XLSX/CSV (obrigatório)
  --backup   JSON gerado por npm run backup:firestore (não consulta o Firebase)
  --sheet    Nome da aba (padrão: primeira)
  --out      Salva o relatório completo em JSON
  --csv      Salva as diferenças em CSV
  --all      Inclui inscritos cancelados
  --only-in-db  Lista só os inscritos que existem no sistema e não na planilha
`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || !args.file) {
    printHelp();
    process.exit(args.help ? 0 : 1);
  }

  const filePath = path.resolve(args.file);
  if (!fs.existsSync(filePath)) {
    console.error(`Arquivo não encontrado: ${filePath}`);
    process.exit(1);
  }

  const spreadsheet = readSpreadsheet(filePath, args.sheet);
  if (spreadsheet.rows.length === 0) {
    console.error('Nenhuma linha útil na planilha. Confira se existe a coluna Influencer (ou e-mail).');
    process.exit(1);
  }

  const source = args.backup
    ? fromBackup(path.resolve(args.backup), args.all)
    : await fromFirestore(args.all);

  const matchedIds = new Set();
  const differences = [];
  const identical = [];
  const unmatchedXls = [];
  const ambiguous = [];

  for (const row of spreadsheet.rows) {
    const match = matchRow(row, source.registrations);
    if (match.kind === 'unmatched') {
      unmatchedXls.push(row);
      continue;
    }
    if (match.kind === 'ambiguous') {
      ambiguous.push({ row, candidates: match.candidates });
      continue;
    }
    matchedIds.add(match.registration.id);
    const diffs = compareMatched(row, match.registration, source.institutions);
    const item = {
      rowNumber: row.rowNumber,
      influencer: row.influencer,
      score: match.score,
      via: match.via,
      registrationId: match.registration.id,
      registrationCode: match.registration.registration_code || '',
      fullName: match.registration.full_name,
      status: match.registration.status || '',
      diffs,
    };
    if (diffs.length > 0) differences.push(item);
    else identical.push(item);
  }

  const onlyInDb = source.registrations
    .filter((r) => !matchedIds.has(r.id))
    .map((r) => ({
      id: r.id,
      registration_code: r.registration_code || '',
      full_name: r.full_name || '',
      email: r.email || '',
      institution_name: r.institution_name || '',
      status: r.status || '',
    }));

  const report = {
    generatedAt: new Date().toISOString(),
    file: filePath,
    sheet: spreadsheet.sheetName,
    source: args.backup ? 'backup' : 'firestore',
    summary: {
      xlsRows: spreadsheet.rows.length,
      registrations: source.registrations.length,
      identical: identical.length,
      different: differences.length,
      unmatchedXls: unmatchedXls.length,
      ambiguous: ambiguous.length,
      onlyInDb: onlyInDb.length,
    },
    differences,
    unmatchedXls,
    ambiguous,
    onlyInDb,
  };

  const printOnlyInDb = () => {
    console.log(`--- Só no sistema (${onlyInDb.length}) ---`);
    if (onlyInDb.length === 0) {
      console.log('  Nenhum inscrito fora da planilha.');
      console.log('');
      return;
    }
    const sorted = [...onlyInDb].sort((a, b) =>
      String(a.full_name).localeCompare(b.full_name, 'pt', { sensitivity: 'base' })
    );
    for (const r of sorted) {
      const inst = r.institution_name ? ` | ${r.institution_name}` : '';
      const email = r.email ? ` | ${r.email}` : '';
      console.log(`  ${r.registration_code || r.id} | ${r.full_name}${email}${inst} | ${r.status || ''}`);
    }
    console.log('');
  };

  if (args.onlyInDb) {
    console.log(`Planilha: ${filePath} (${spreadsheet.rows.length} linhas)`);
    console.log(`Inscritos: ${source.registrations.length} (${args.backup ? 'backup' : 'Firestore'})`);
    console.log('');
    printOnlyInDb();
    if (args.out) {
      const outPath = path.resolve(args.out);
      fs.writeFileSync(outPath, JSON.stringify({ summary: report.summary, onlyInDb }, null, 2), 'utf8');
      console.log(`JSON salvo em ${outPath}`);
    }
    return;
  }

  console.log(`Planilha: ${filePath} (aba ${spreadsheet.sheetName}, ${spreadsheet.rows.length} linhas)`);
  console.log(`Inscritos: ${source.registrations.length} (${args.backup ? 'backup' : 'Firestore'})`);
  console.log('');
  console.log(`Iguais:              ${report.summary.identical}`);
  console.log(`Com diferenças:      ${report.summary.different}`);
  console.log(`Só na planilha:      ${report.summary.unmatchedXls}`);
  console.log(`Match ambíguo:       ${report.summary.ambiguous}`);
  console.log(`Só no sistema:       ${report.summary.onlyInDb}`);
  console.log('');

  if (differences.length > 0) {
    console.log('--- Diferenças ---');
    for (const item of differences) {
      console.log(
        `\nLinha ${item.rowNumber} | ${item.influencer}  ↔  ${item.fullName} (${item.registrationCode || item.registrationId}, ${item.via} ${item.score})`
      );
      for (const d of item.diffs) {
        console.log(`  ${d.field}:`);
        console.log(`    XLS: ${d.xls || '(vazio)'}`);
        console.log(`    DB:  ${d.db || '(vazio)'}`);
      }
    }
    console.log('');
  }

  if (unmatchedXls.length > 0) {
    console.log('--- Só na planilha (sem inscrito correspondente) ---');
    for (const row of unmatchedXls) {
      console.log(`  Linha ${row.rowNumber}: ${row.influencer || '(sem nome)'} ${row.email ? `<${row.email}>` : ''}`);
    }
    console.log('');
  }

  if (ambiguous.length > 0) {
    console.log('--- Match ambíguo ---');
    for (const item of ambiguous) {
      const names = item.candidates.map((c) => `${c.full_name} (${c.id})`).join(' | ');
      console.log(`  Linha ${item.row.rowNumber}: ${item.row.influencer} → ${names}`);
    }
    console.log('');
  }

  printOnlyInDb();

  if (args.out) {
    const outPath = path.resolve(args.out);
    fs.writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf8');
    console.log(`JSON salvo em ${outPath}`);
  }

  if (args.csv) {
    const csvPath = path.resolve(args.csv);
    const lines = [['linha', 'influencer', 'codigo', 'nome_db', 'campo', 'xls', 'db'].join(',')];
    for (const item of differences) {
      for (const d of item.diffs) {
        lines.push(
          [
            item.rowNumber,
            csvEscape(item.influencer),
            csvEscape(item.registrationCode),
            csvEscape(item.fullName),
            csvEscape(d.field),
            csvEscape(d.xls),
            csvEscape(d.db),
          ].join(',')
        );
      }
    }
    fs.writeFileSync(csvPath, lines.join('\n'), 'utf8');
    console.log(`CSV salvo em ${csvPath}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
