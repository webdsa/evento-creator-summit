import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { parseExpiresAtInputToUtcIso } from '@/lib/app-timezone';
import { listVouchers, createVoucher } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    await requireAdmin(authHeader);
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  try {
    const list = await listVouchers();
    return NextResponse.json(list);
  } catch (error) {
    console.error('List vouchers error:', error);
    return NextResponse.json({ error: 'genericError' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    await requireAdmin(authHeader);
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  try {
    const body = await request.json();
    const { code, institution_id, quota_total, status, expires_at } = body;
    if (!code || !institution_id || quota_total === undefined) {
      return NextResponse.json({ error: 'missingFields' }, { status: 400 });
    }
    const codeStr = String(code).trim().toUpperCase();
    if (codeStr.length === 0 || codeStr.length > 64) {
      return NextResponse.json({ error: 'invalidRequest' }, { status: 400 });
    }
    const instId = String(institution_id).trim();
    if (instId.length === 0 || instId.length > 1500) {
      return NextResponse.json({ error: 'invalidRequest' }, { status: 400 });
    }
    const quota = Number(quota_total);
    if (!Number.isInteger(quota) || quota < 0 || quota > 1_000_000) {
      return NextResponse.json({ error: 'invalidRequest' }, { status: 400 });
    }
    const statusVal = status === 'paused' ? 'paused' : 'active';
    let expiresAt: string | null = null;
    if (expires_at != null && expires_at !== '') {
      const expStr = String(expires_at).trim();
      if (expStr) {
        const iso = parseExpiresAtInputToUtcIso(expStr);
        if (!iso) {
          return NextResponse.json({ error: 'invalidRequest' }, { status: 400 });
        }
        expiresAt = iso;
      }
    }
    const voucher = await createVoucher({
      code: codeStr,
      institution_id: instId,
      quota_total: quota,
      status: statusVal,
      expires_at: expiresAt,
    });
    return NextResponse.json(voucher);
  } catch (error) {
    console.error('Create voucher error:', error);
    return NextResponse.json({ error: 'genericError' }, { status: 500 });
  }
}
