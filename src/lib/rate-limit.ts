/**
 * 간단한 인메모리 레이트 리밋 (단일 인스턴스 기준)
 * Railway 멀티 인스턴스에서는 대략적 보호만 제공
 */

type Bucket = { count: number; resetAt: number };

const store = new Map<string, Bucket>();

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): { ok: boolean; remaining: number; retryAfterSec: number } {
  const now = Date.now();
  const bucket = store.get(key);

  if (!bucket || now >= bucket.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfterSec: 0 };
  }

  if (bucket.count >= limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfterSec: Math.ceil((bucket.resetAt - now) / 1000),
    };
  }

  bucket.count += 1;
  return {
    ok: true,
    remaining: limit - bucket.count,
    retryAfterSec: 0,
  };
}

/** 주기적 정리 (메모리 누수 방지) */
export function pruneRateLimits() {
  const now = Date.now();
  for (const [k, v] of store) {
    if (now >= v.resetAt) store.delete(k);
  }
}

// 가끔 정리
if (typeof setInterval !== "undefined") {
  setInterval(pruneRateLimits, 60_000).unref?.();
}
