import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { listSpeakers, createSpeaker } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    await requireAdmin(authHeader);
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  try {
    const list = await listSpeakers();
    return NextResponse.json(list);
  } catch (error) {
    console.error('List speakers error:', error);
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
    const { name, biography, photo } = body;
    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'missingFields' }, { status: 400 });
    }
    const nameStr = name.trim();
    if (nameStr.length === 0 || nameStr.length > 200) {
      return NextResponse.json({ error: 'invalidRequest' }, { status: 400 });
    }
    const biographyStr = typeof biography === 'string' ? biography.trim() : '';
    const photoStr = typeof photo === 'string' ? photo.trim() : '';
    const speaker = await createSpeaker({
      name: nameStr,
      biography: biographyStr,
      photo: photoStr,
    });
    return NextResponse.json(speaker);
  } catch (error) {
    console.error('Create speaker error:', error);
    return NextResponse.json({ error: 'genericError' }, { status: 500 });
  }
}
