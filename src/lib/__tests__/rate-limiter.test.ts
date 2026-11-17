import { describe, it, expect, beforeEach } from "vitest";
import { rateLimit, _resetRateLimiter } from "../rate-limiter";

describe("rate-limiter", () => {
  beforeEach(() => {
    _resetRateLimiter();
  });

  it("should allow requests under the limit", () => {
    const ip = "192.168.1.100";
    const res1 = rateLimit(ip, 3, 10000);
    expect(res1.success).toBe(true);
    expect(res1.remaining).toBe(2);

    const res2 = rateLimit(ip, 3, 10000);
    expect(res2.success).toBe(true);
    expect(res2.remaining).toBe(1);

    const res3 = rateLimit(ip, 3, 10000);
    expect(res3.success).toBe(true);
    expect(res3.remaining).toBe(0);
  });

  it("should block requests exceeding the limit", () => {
    const ip = "192.168.1.101";
    rateLimit(ip, 2, 10000);
    rateLimit(ip, 2, 10000);

    const blocked = rateLimit(ip, 2, 10000);
    expect(blocked.success).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.resetInSeconds).toBeGreaterThan(0);
  });

  it("should track distinct IPs independently", () => {
    const ip1 = "10.0.0.1";
    const ip2 = "10.0.0.2";

    rateLimit(ip1, 1, 10000);
    const blockedIp1 = rateLimit(ip1, 1, 10000);
    expect(blockedIp1.success).toBe(false);

    const allowedIp2 = rateLimit(ip2, 1, 10000);
    expect(allowedIp2.success).toBe(true);
  });
});
