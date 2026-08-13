import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { updateInstitution, deleteInstitution } from '@/lib/db';
import { isValidCountryId } from '@/lib/countries';
import type { InstitutionGroup } from '@/lib/db';

function parseInstitutionGroup(value: unknown): InstitutionGroup | undefined {
  const n = Number(value);
  if (n === 1 || n === 2 || n === 3) return n as InstitutionGroup;
  return undefined;
}

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
    const { name, quota_total, status, country, group } = body;
    const updates: {
      name?: string;
      quota_total?: number;
      status?: 'active' | 'inactive';
      country?: string;
      group?: InstitutionGroup;
    } = {};
    if (name !== undefined) {
      const nameStr = String(name).trim();
      if (nameStr.length === 0 || nameStr.length > 200) {
        return NextResponse.json({ error: 'invalidRequest' }, { status: 400 });
      }
      updates.name = nameStr;
    }
    if (quota_total !== undefined) {
      const quota = Number(quota_total);
      if (!Number.isInteger(quota) || quota < 0 || quota > 1_000_000) {
        return NextResponse.json({ error: 'invalidRequest' }, { status: 400 });
      }
      updates.quota_total = quota;
    }
    if (status !== undefined) {
      if (status !== 'active' && status !== 'inactive') {
        return NextResponse.json({ error: 'invalidRequest' }, { status: 400 });
      }
      updates.status = status;
    }
    if (country !== undefined) {
      if (country === null || country === '') {
        updates.country = '';
      } else if (isValidCountryId(String(country))) {
        updates.country = String(country);
      } else {
        return NextResponse.json({ error: 'invalidRequest' }, { status: 400 });
      }
    }
    if (group !== undefined) {
      const g = parseInstitutionGroup(group);
      if (g === undefined) {
        return NextResponse.json({ error: 'invalidRequest' }, { status: 400 });
      }
      updates.group = g;
    }
    await updateInstitution(id, updates);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Update institution error:', error);
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
    await deleteInstitution(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Delete institution error:', error);
    return NextResponse.json({ error: 'genericError' }, { status: 500 });
  }
}
