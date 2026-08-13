import { NextRequest, NextResponse } from 'next/server';

const MAX_CODE_LENGTH = 32;

/**
 * GET /api/public/qrcode?code=XXX
 * Retorna imagem PNG do QR Code do código de inscrição (para check-in).
 * Usado na mensagem de confirmação por WhatsApp.
 */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')?.trim().toUpperCase().slice(0, MAX_CODE_LENGTH) ?? '';
  if (!code) {
    return NextResponse.json({ error: 'missingCode' }, { status: 400 });
  }

  try {
    // Conteúdo do QR = código de inscrição (ex.: JYJTG), usado no check-in pelo organizador
    const QRCode = await import('qrcode');
    const buffer = await QRCode.toBuffer(code, { type: 'png', width: 256, margin: 2 });
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (err) {
    console.error('[QRCode] Generate error:', err);
    return NextResponse.json({ error: 'generationFailed' }, { status: 500 });
  }
}
