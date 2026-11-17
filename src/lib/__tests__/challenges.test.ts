import { describe, it, expect } from "vitest";
import { getChallenge, getAllChallenges } from "../challenges";

describe("challenges", () => {
  it("should return all defined challenges", () => {
    const list = getAllChallenges();
    expect(list.length).toBeGreaterThanOrEqual(3);
  });

  it("should find challenge by exact slug", () => {
    const c = getChallenge("demo-challenge");
    expect(c).toBeDefined();
    expect(c?.title).toContain("Fraud Scoring");
  });

  it("should find challenge by alias", () => {
    const c = getChallenge("real-time-fraud-scoring");
    expect(c).toBeDefined();
    expect(c?.id).toBe("c_fraud_scoring");
  });

  it("should return undefined for non-existent challenge", () => {
    const c = getChallenge("non-existent-xyz");
    expect(c).toBeUndefined();
  });
});
