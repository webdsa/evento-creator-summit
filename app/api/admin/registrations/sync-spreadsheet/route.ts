import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import {
  createImportedRegistration,
  listInstitutions,
  listRegistrations,
  listVouchers,
  reassignRegistrationInstitution,
  updateRegistration,
} from '@/lib/db';
import {
  matchInstitutionByUniao,
  planSpreadsheetSync,
  type SpreadsheetRowInput,
} from '@/lib/spreadsheet-sync';

const MAX_ROWS = 4000;

function parseRows(body: unknown): SpreadsheetRowInput[] | null {
  if (!body || typeof body !== 'object') return null;
  const rows = (body as { rows?: unknown }).rows;
  if (!Array.isArray(rows) || rows.length === 0 || rows.length > MAX_ROWS) return null;
  const parsed: SpreadsheetRowInput[] = [];
  for (const raw of rows) {
    if (!raw || typeof raw !== 'object') continue;
    const r = raw as Record<string, unknown>;
    parsed.push({
      rowNumber: typeof r.rowNumber === 'number' ? r.rowNumber : parsed.length + 2,
      influencer: typeof r.influencer === 'string' ? r.influencer : '',
      arroba: typeof r.arroba === 'string' ? r.arroba : '',
      nicho: typeof r.nicho === 'string' ? r.nicho : '',
      uniao: typeof r.uniao === 'string' ? r.uniao : '',
      email: typeof r.email === 'string' ? r.email : undefined,
      phone: typeof r.phone === 'string' ? r.phone : undefined,
    });
  }
  return parsed;
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request.headers.get('authorization'));
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const rows = parseRows(body);
    if (!rows) {
      return NextResponse.json({ error: 'invalidRequest' }, { status: 400 });
    }
    const dryRun = body?.dryRun !== false;

    const registrations = await listRegistrations();
    const institutions = await listInstitutions();
    const vouchers = await listVouchers();
    const plan = planSpreadsheetSync(rows, registrations, institutions);

    if (dryRun) {
      return NextResponse.json({
        dryRun: true,
        summary: summarize(plan),
        actions: plan,
      });
    }

    const applied = [];
    for (const action of plan) {
      try {
        if (action.kind === 'update') {
          await updateRegistration(action.registrationId, {
            cracha: action.cracha,
            link_or_handle: action.arroba ?? '',
            conteudo: action.conteudo,
          });
          if (action.institutionStatus === 'matched' && action.institutionId && action.institutionName) {
            const voucher = pickVoucherForInstitution(
              action.institutionId,
              vouchers.map((v) => ({
                id: v.id,
                code: v.code,
                institution_id: v.institution_id,
                status: v.status,
                used_count: v.used_count,
                quota_total: v.quota_total,
              }))
            );
            await reassignRegistrationInstitution(
              action.registrationId,
              { id: action.institutionId, name: action.institutionName },
              voucher
            );
          }
          applied.push({ ...action, applied: true });
          continue;
        }
        if (action.kind === 'create') {
          const inst =
            action.institutionStatus === 'matched' && action.institutionId && action.institutionName
              ? { id: action.institutionId, name: action.institutionName }
              : matchInstitutionByUniao(action.uniao, institutions);
          const voucher = inst
            ? pickVoucherForInstitution(
                inst.id,
                vouchers.map((v) => ({
                  id: v.id,
                  code: v.code,
                  institution_id: v.institution_id,
                  status: v.status,
                  used_count: v.used_count,
                  quota_total: v.quota_total,
                }))
              )
            : null;
          const created = await createImportedRegistration({
            full_name: action.influencer,
            cracha: action.cracha,
            link_or_handle: action.arroba,
            conteudo: action.conteudo,
            email: action.email,
            phone: action.phone,
            institution_id: inst?.id,
            institution_name: inst?.name,
            voucher_id: voucher?.id,
            voucher_code: voucher?.code,
          });
          if (!created.success) {
            applied.push({ ...action, applied: false, error: created.error });
            continue;
          }
          applied.push({
            ...action,
            applied: true,
            registrationId: created.registration_id,
            registrationCode: created.registration_code,
          });
          continue;
        }
        applied.push({ ...action, applied: false });
      } catch (rowError) {
        console.error('Spreadsheet sync row error:', rowError);
        applied.push({ ...action, applied: false, error: 'genericError' });
      }
    }

    return NextResponse.json({
      dryRun: false,
      summary: summarize(plan),
      actions: applied,
    });
  } catch (error) {
    console.error('Spreadsheet sync error:', error);
    return NextResponse.json({ error: 'genericError' }, { status: 500 });
  }
}

function summarize(plan: ReturnType<typeof planSpreadsheetSync>) {
  return {
    update: plan.filter((a) => a.kind === 'update').length,
    create: plan.filter((a) => a.kind === 'create').length,
    ambiguous: plan.filter((a) => a.kind === 'ambiguous').length,
    skip: plan.filter((a) => a.kind === 'skip').length,
  };
}

function pickVoucherForInstitution(
  institutionId: string,
  vouchers: {
    id: string;
    code: string;
    institution_id: string;
    status: string;
    used_count: number;
    quota_total: number;
  }[]
) {
  const ofInst = vouchers.filter((v) => v.institution_id === institutionId);
  const withQuota = ofInst.filter(
    (v) => v.status === 'active' && v.used_count < v.quota_total
  );
  return withQuota[0] ?? ofInst[0] ?? null;
}
