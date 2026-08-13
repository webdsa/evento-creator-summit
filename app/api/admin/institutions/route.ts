import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import {
  listInstitutions,
  createInstitution,
} from '@/lib/db';
import { isValidCountryId } from '@/lib/countries';
import type { InstitutionGroup } from '@/lib/db';

function parseInstitutionGroup(value: unknown): InstitutionGroup | undefined {
  const n = Number(value);
  if (n === 1 || n === 2 || n === 3) return n as InstitutionGroup;
  return undefined;
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    await requireAdmin(authHeader);
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  try {
    const list = await listInstitutions();
    return NextResponse.json(list);
  } catch (error) {
    console.error('List institutions error:', error);
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
    const { name, quota_total, status, country, group } = body;
    if (!name || quota_total === undefined) {
      return NextResponse.json({ error: 'missingFields' }, { status: 400 });
    }
    const nameStr = String(name).trim();
    if (nameStr.length === 0 || nameStr.length > 200) {
      return NextResponse.json({ error: 'invalidRequest' }, { status: 400 });
    }
    const quota = Number(quota_total);
    if (!Number.isInteger(quota) || quota < 0 || quota > 1_000_000) {
      return NextResponse.json({ error: 'invalidRequest' }, { status: 400 });
    }
    const statusVal = status === 'inactive' ? 'inactive' : 'active';
    const countryVal =
      country !== undefined && country !== null && country !== ''
        ? isValidCountryId(String(country))
          ? String(country)
          : undefined
        : undefined;
    const groupParsed = parseInstitutionGroup(group);
    const institution = await createInstitution({
      name: nameStr,
      quota_total: quota,
      status: statusVal,
      country: countryVal,
      group: groupParsed ?? 1,
    });
    return NextResponse.json(institution);
  } catch (error) {
    console.error('Create institution error:', error);
    return NextResponse.json({ error: 'genericError' }, { status: 500 });
  }
}
