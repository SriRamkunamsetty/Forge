import { NextRequest } from "next/server";

interface RateLimitRecord {
  timestamps: number[];
}

const ipRequestMap = new Map<string, RateLimitRecord>();

// Clean up stale IP records every 5 minutes
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanupStaleRecords(windowMs: number) {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;

  const threshold = now - windowMs;
  ipRequestMap.forEach((record, ip) => {
    const valid = record.timestamps.filter((ts: number) => ts > threshold);
    if (valid.length === 0) {
      ipRequestMap.delete(ip);
    } else {
      record.timestamps = valid;
    }
  });
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetInSeconds: number;
}

/**
 * Sliding window in-memory rate limiter.
 *
 * @param ip Client IP address or unique client identifier
 * @param limit Max allowed requests within the time window (default: 5)
 * @param windowMs Time window in milliseconds (default: 60,000ms = 1 minute)
 */
export function rateLimit(
  ip: string,
  limit: number = 5,
  windowMs: number = 60 * 1000
): RateLimitResult {
  const now = Date.now();
  cleanupStaleRecords(windowMs);

  let record = ipRequestMap.get(ip);
  if (!record) {
    record = { timestamps: [] };
    ipRequestMap.set(ip, record);
  }

  // Filter timestamps within current sliding window
  const windowStart = now - windowMs;
  record.timestamps = record.timestamps.filter((ts) => ts > windowStart);

  if (record.timestamps.length >= limit) {
    const oldest = record.timestamps[0];
    const resetInSeconds = Math.ceil((oldest + windowMs - now) / 1000);
    return {
      success: false,
      limit,
      remaining: 0,
      resetInSeconds: Math.max(1, resetInSeconds),
    };
  }

  record.timestamps.push(now);
  const remaining = limit - record.timestamps.length;
  const resetInSeconds = Math.ceil(windowMs / 1000);

  return {
    success: true,
    limit,
    remaining,
    resetInSeconds,
  };
}

/** Reset rate limit state (helpful in tests) */
export function _resetRateLimiter(): void {
  ipRequestMap.clear();
}

/** Extract reliable client IP from headers */
export function getClientIp(req: NextRequest): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const firstIp = forwardedFor.split(",")[0].trim();
    if (firstIp) return firstIp;
  }

  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  return req.ip || "127.0.0.1";
}
