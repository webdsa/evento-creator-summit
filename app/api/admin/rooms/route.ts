import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { listRooms, createRoom } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    await requireAdmin(authHeader);
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  try {
    const list = await listRooms();
    return NextResponse.json(list);
  } catch (error) {
    console.error('List rooms error:', error);
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
    const { name, capacity, enabled } = body;
    if (!name || capacity === undefined) {
      return NextResponse.json({ error: 'missingFields' }, { status: 400 });
    }
    const nameStr = String(name).trim();
    if (nameStr.length === 0 || nameStr.length > 200) {
      return NextResponse.json({ error: 'invalidRequest' }, { status: 400 });
    }
    const cap = Number(capacity);
    if (!Number.isInteger(cap) || cap < 1 || cap > 100_000) {
      return NextResponse.json({ error: 'invalidRequest' }, { status: 400 });
    }
    const enabledVal = enabled === false ? false : true;
    const room = await createRoom({ name: nameStr, capacity: cap, enabled: enabledVal });
    return NextResponse.json(room);
  } catch (error) {
    console.error('Create room error:', error);
    return NextResponse.json({ error: 'genericError' }, { status: 500 });
  }
}
