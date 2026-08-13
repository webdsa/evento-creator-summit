import { NextRequest, NextResponse } from 'next/server';
import { getVoucherByCode, getInstitutionRemainingFromVouchers } from '@/lib/db';
import { checkRateLimit, getRateLimitIdentifier } from '@/lib/rate-limit';

export async function GET(request: NextRequest) {
  const identifier = getRateLimitIdentifier(request);
  const rateLimit = checkRateLimit(identifier);

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'rateLimitExceeded' },
      { status: 429 }
    );
  }

  const MAX_CODE_LENGTH = 64;
  const rawCode = request.nextUrl.searchParams.get('code');
  const code = rawCode ? rawCode.trim().slice(0, MAX_CODE_LENGTH) : '';

  if (!code) {
    return NextResponse.json(
      { error: 'voucherNotFound' },
      { status: 400 }
    );
  }

  try {
    const voucher = await getVoucherByCode(code);

    if (!voucher) {
      return NextResponse.json(
        { error: 'voucherNotFound' },
        { status: 404 }
      );
    }

    if (voucher.status !== 'active') {
      return NextResponse.json(
        { error: 'voucherInactive' },
        { status: 400 }
      );
    }

    if (voucher.expires_at && new Date(voucher.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'voucherExpired' },
        { status: 400 }
      );
    }

    const voucherRemaining = (voucher.quota_total ?? 0) - (voucher.used_count ?? 0);
    if (voucherRemaining <= 0) {
      return NextResponse.json(
        { error: 'voucherNoQuota' },
        { status: 400 }
      );
    }

    const institution = voucher.institution;
    if (!institution) {
      return NextResponse.json(
        { error: 'institutionNoQuota' },
        { status: 400 }
      );
    }

    const institutionStats = await getInstitutionRemainingFromVouchers(voucher.institution_id);
    if (institutionStats.remaining <= 0) {
      return NextResponse.json(
        { error: 'institutionNoQuota' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      id: voucher.id,
      code: voucher.code,
      quotaTotal: voucher.quota_total ?? 0,
      usedCount: voucher.used_count ?? 0,
      remaining: Math.max(0, voucherRemaining),
      institution: {
        id: institution.id,
        name: institution.name,
        country: institution.country ?? undefined,
        quotaTotal: institution.quota_total ?? 0,
        usedCount: institution.used_count ?? 0,
        remaining: institutionStats.remaining,
        vouchersWithQuotaCount: institutionStats.vouchersWithQuotaCount,
      },
    });
  } catch (error) {
    console.error('Voucher validation error:', error);
    return NextResponse.json(
      { error: 'genericError' },
      { status: 500 }
    );
  }
}
