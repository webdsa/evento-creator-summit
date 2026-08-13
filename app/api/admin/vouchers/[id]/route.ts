import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { parseExpiresAtInputToUtcIso } from '@/lib/app-timezone';
import { updateVoucher, deleteVoucher } from '@/lib/db';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization');
    await requireAdmin(authHeader);
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  try {
    const { id } = await params;
    if (!id || typeof id !== 'string' || id.length > 1500) {
      return NextResponse.json({ error: 'invalidRequest' }, { status: 400 });
    }
    const body = await request.json();
    const { code, quota_total, status, expires_at } = body;
    const updates: { code?: string; quota_total?: number; status?: 'active' | 'paused'; expires_at?: string | null } = {};
    if (code !== undefined) {
      const codeStr = String(code).trim().toUpperCase();
      if (codeStr.length === 0 || codeStr.length > 64) {
        return NextResponse.json({ error: 'invalidRequest' }, { status: 400 });
      }
      updates.code = codeStr;
    }
    if (quota_total !== undefined) {
      const quota = Number(quota_total);
      if (!Number.isInteger(quota) || quota < 0 || quota > 1_000_000) {
        return NextResponse.json({ error: 'invalidRequest' }, { status: 400 });
      }
      updates.quota_total = quota;
    }
    if (status !== undefined) {
      if (status !== 'active' && status !== 'paused') {
        return NextResponse.json({ error: 'invalidRequest' }, { status: 400 });
      }
      updates.status = status;
    }
    if (expires_at !== undefined) {
      if (expires_at == null || expires_at === '') {
        updates.expires_at = null;
      } else {
        const iso = parseExpiresAtInputToUtcIso(String(expires_at).trim());
        if (!iso) {
          return NextResponse.json({ error: 'invalidRequest' }, { status: 400 });
        }
        updates.expires_at = iso;
      }
    }
    await updateVoucher(id, updates);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Update voucher error:', error);
    return NextResponse.json({ error: 'genericError' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = _request.headers.get('authorization');
    await requireAdmin(authHeader);
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  try {
    const { id } = await params;
    if (!id || typeof id !== 'string' || id.length > 1500) {
      return NextResponse.json({ error: 'invalidRequest' }, { status: 400 });
    }
    await deleteVoucher(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Delete voucher error:', error);
    return NextResponse.json({ error: 'genericError' }, { status: 500 });
  }
}
