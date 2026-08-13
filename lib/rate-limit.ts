const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS = 10;

function cleanupOldEntries() {
  const now = Date.now();
  Array.from(rateLimitMap.entries()).forEach(([key, value]) => {
    if (now > value.resetTime) {
      rateLimitMap.delete(key);
    }
  });
}

export function checkRateLimit(identifier: string): { allowed: boolean; remaining: number } {
  if (process.env.NODE_ENV === 'development') {
    return { allowed: true, remaining: MAX_REQUESTS };
  }

  cleanupOldEntries();

  const now = Date.now();
  const record = rateLimitMap.get(identifier);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(identifier, {
      count: 1,
      resetTime: now + WINDOW_MS,
    });
    return { allowed: true, remaining: MAX_REQUESTS - 1 };
  }

  if (record.count >= MAX_REQUESTS) {
    return { allowed: false, remaining: 0 };
  }

  record.count++;
  return { allowed: true, remaining: MAX_REQUESTS - record.count };
}

const MAX_IDENTIFIER_LENGTH = 64;

export function getRateLimitIdentifier(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  const raw = forwarded ? forwarded.split(',')[0].trim() : 'unknown';
  if (raw.length > MAX_IDENTIFIER_LENGTH) {
    return raw.slice(0, MAX_IDENTIFIER_LENGTH);
  }
  return raw || 'unknown';
}
