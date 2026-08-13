import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { updateWorkshop, deleteWorkshop } from '@/lib/db';

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
    const { title, description, type, speaker_ids, room_id, title_es, description_es } = body;
    const updates: {
      title?: string;
      description?: string;
      type?: 'workshop' | 'plenaria';
      speaker_ids?: string[];
      room_id?: string;
      title_es?: string;
      description_es?: string;
    } = {};
    if (title !== undefined) {
      const titleStr = String(title).trim();
      if (titleStr.length === 0 || titleStr.length > 300) {
        return NextResponse.json({ error: 'invalidRequest' }, { status: 400 });
      }
      updates.title = titleStr;
    }
    if (description !== undefined) {
      updates.description = String(description).trim();
    }
    if (type !== undefined) {
      updates.type = type === 'plenaria' ? 'plenaria' : 'workshop';
    }
    if (speaker_ids !== undefined) {
      updates.speaker_ids = Array.isArray(speaker_ids)
        ? (speaker_ids as unknown[]).filter((x): x is string => typeof x === 'string' && x.trim())
        : [];
    }
    if (room_id !== undefined) {
      updates.room_id = typeof room_id === 'string' ? room_id.trim() : '';
    }
    if (title_es !== undefined) updates.title_es = typeof title_es === 'string' ? title_es.trim() : undefined;
    if (description_es !== undefined) updates.description_es = typeof description_es === 'string' ? description_es.trim() : undefined;
    await updateWorkshop(id, updates);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Update workshop error:', error);
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
    await deleteWorkshop(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Delete workshop error:', error);
    return NextResponse.json({ error: 'genericError' }, { status: 500 });
  }
}
