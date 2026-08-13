import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { listWorkshops, createWorkshop } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    await requireAdmin(authHeader);
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  try {
    const list = await listWorkshops();
    return NextResponse.json(list);
  } catch (error) {
    console.error('List workshops error:', error);
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
    const { title, description, type, speaker_ids, room_id, title_es, description_es } = body;
    if (!title || typeof title !== 'string') {
      return NextResponse.json({ error: 'missingFields' }, { status: 400 });
    }
    const titleStr = title.trim();
    if (titleStr.length === 0 || titleStr.length > 300) {
      return NextResponse.json({ error: 'invalidRequest' }, { status: 400 });
    }
    const descriptionStr = typeof description === 'string' ? description.trim() : '';
    const workshopType = type === 'plenaria' ? 'plenaria' : 'workshop';
    const ids = Array.isArray(speaker_ids)
      ? (speaker_ids as unknown[]).filter((x): x is string => typeof x === 'string' && x.trim())
      : [];
    const roomIdStr = typeof room_id === 'string' ? room_id.trim() : '';
    const workshop = await createWorkshop({
      title: titleStr,
      description: descriptionStr,
      type: workshopType,
      speaker_ids: ids,
      room_id: roomIdStr,
      title_es: typeof title_es === 'string' ? title_es.trim() : undefined,
      description_es: typeof description_es === 'string' ? description_es.trim() : undefined,
    });
    return NextResponse.json(workshop);
  } catch (error) {
    console.error('Create workshop error:', error);
    return NextResponse.json({ error: 'genericError' }, { status: 500 });
  }
}
