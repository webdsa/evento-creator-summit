import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { updateRoom, deleteRoom } from '@/lib/db';

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
    const { name, capacity, enabled } = body;
    const updates: { name?: string; capacity?: number; enabled?: boolean } = {};
    if (name !== undefined) {
      const nameStr = String(name).trim();
      if (nameStr.length === 0 || nameStr.length > 200) {
        return NextResponse.json({ error: 'invalidRequest' }, { status: 400 });
      }
      updates.name = nameStr;
    }
    if (capacity !== undefined) {
      const cap = Number(capacity);
      if (!Number.isInteger(cap) || cap < 1 || cap > 100_000) {
        return NextResponse.json({ error: 'invalidRequest' }, { status: 400 });
      }
      updates.capacity = cap;
    }
    if (enabled !== undefined) {
      updates.enabled = Boolean(enabled);
    }
    await updateRoom(id, updates);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Update room error:', error);
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
    await deleteRoom(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Delete room error:', error);
    return NextResponse.json({ error: 'genericError' }, { status: 500 });
  }
}
