import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { updateSpeaker, deleteSpeaker } from '@/lib/db';

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
    const { name, biography, photo } = body;
    const updates: { name?: string; biography?: string; photo?: string } = {};
    if (name !== undefined) {
      const nameStr = String(name).trim();
      if (nameStr.length === 0 || nameStr.length > 200) {
        return NextResponse.json({ error: 'invalidRequest' }, { status: 400 });
      }
      updates.name = nameStr;
    }
    if (biography !== undefined) {
      updates.biography = String(biography).trim();
    }
    if (photo !== undefined) {
      updates.photo = String(photo).trim();
    }
    await updateSpeaker(id, updates);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Update speaker error:', error);
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
    await deleteSpeaker(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Delete speaker error:', error);
    return NextResponse.json({ error: 'genericError' }, { status: 500 });
  }
}
