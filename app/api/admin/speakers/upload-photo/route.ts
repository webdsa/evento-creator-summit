import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { requireAdmin } from '@/lib/auth';

const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    await requireAdmin(authHeader);
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN?.trim()) {
    return NextResponse.json(
      { error: 'Storage not configured (BLOB_READ_WRITE_TOKEN)' },
      { status: 503 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get('photo') as File | null;
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'missingFile' }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'fileTooLarge' }, { status: 400 });
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'invalidFileType' }, { status: 400 });
    }

    const ext = file.name.split('.').pop() || 'jpg';
    const safeExt = ['jpeg', 'jpg', 'png', 'webp', 'gif'].includes(ext.toLowerCase())
      ? ext.toLowerCase()
      : 'jpg';
    const pathname = `speakers/${Date.now()}-${Math.random().toString(36).slice(2)}.${safeExt}`;

    const blob = await put(pathname, file, {
      access: 'public',
      contentType: file.type,
      addRandomSuffix: false,
    });

    return NextResponse.json({ url: blob.url });
  } catch (error: unknown) {
    console.error('Upload speaker photo error:', error);
    return NextResponse.json({ error: 'genericError' }, { status: 500 });
  }
}
