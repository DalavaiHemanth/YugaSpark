/**
 * Simple in-memory rate limiter for Vercel serverless API routes.
 *
 * Note: Each serverless instance has its own memory, so limits are
 * per-instance, not globally coordinated. For 150 trusted club members
 * this is sufficient to prevent accidental spam or runaway loops.
 *
 * Limits are applied per userId (authenticated) or per IP (unauthenticated).
 */

interface RateLimitRecord {
  count: number;
  windowStart: number;
}

const store = new Map<string, RateLimitRecord>();

// Clean up old entries every 10 minutes to avoid memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of store.entries()) {
    if (now - record.windowStart > 10 * 60_000) store.delete(key);
  }
}, 10 * 60_000);

export interface RateLimitOptions {
  /** Unique key for this limit (e.g. "send-email") */
  route: string;
  /** Max requests allowed in the window */
  limit: number;
  /** Window duration in milliseconds */
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetMs: number;
}

export function checkRateLimit(
  identifier: string, // userId or IP
  opts: RateLimitOptions,
): RateLimitResult {
  const key = `${opts.route}:${identifier}`;
  const now = Date.now();
  const record = store.get(key);

  if (!record || now - record.windowStart >= opts.windowMs) {
    // New window
    store.set(key, { count: 1, windowStart: now });
    return { allowed: true, remaining: opts.limit - 1, resetMs: opts.windowMs };
  }

  record.count += 1;
  const remaining = Math.max(0, opts.limit - record.count);
  const resetMs = opts.windowMs - (now - record.windowStart);

  return {
    allowed: record.count <= opts.limit,
    remaining,
    resetMs,
  };
}

/** Pre-configured limits for each route */
export const LIMITS = {
  /** Email blast — most expensive, strictest limit */
  "send-email": { limit: 3, windowMs: 60_000 },           // 3 per minute
  "test-smtp": { limit: 5, windowMs: 60_000 },             // 5 per minute

  /** Bulk operations */
  "admin-import-students": { limit: 5, windowMs: 5 * 60_000 }, // 5 per 5 min
  "admin-create-students": { limit: 10, windowMs: 60_000 },     // 10 per minute

  /** Single user operations */
  "admin-delete-user": { limit: 20, windowMs: 60_000 },    // 20 per minute
  "admin-set-password": { limit: 10, windowMs: 60_000 },   // 10 per minute
  "admin-set-role": { limit: 20, windowMs: 60_000 },       // 20 per minute
  "ensure-admin-accounts": { limit: 5, windowMs: 60_000 }, // 5 per minute
  "can-sign-up": { limit: 30, windowMs: 60_000 },          // 30 per minute (public)
} as const satisfies Record<string, { limit: number; windowMs: number }>;
