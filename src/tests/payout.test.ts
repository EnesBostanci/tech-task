import { describe, expect, it } from "vitest";
import { calculatePayout } from "@/lib/payout";

describe("calculatePayout", () => {
    it("returns zero below 1000 views", () => {
        expect(calculatePayout(999, 500)).toBe(0);
    });

    it("returns zero for zero views", () => {
        expect(calculatePayout(0, 500)).toBe(0);
    });

    it("returns zero for zero payout rate", () => {
        expect(calculatePayout(2000, 0)).toBe(0);
    });

    it("pays one unit at 1000 views", () => {
        expect(calculatePayout(1000, 500)).toBe(500);
    });

    it("does not pay the next unit before another 1000 views", () => {
        expect(calculatePayout(1999, 500)).toBe(500);
    });

    it("pays two units at 2000 views", () => {
        expect(calculatePayout(2000, 500)).toBe(1000);
    });

    it("handles large numbers", () => {
        expect(calculatePayout(1_000_000_000, 500)).toBe(500_000_000);
    });

    it("rejects negative views", () => {
        expect(() => calculatePayout(-1000, 500)).toThrow();
    });

    it("rejects negative payout rate", () => {
        expect(() => calculatePayout(1000, -500)).toThrow();
    });

    it("rejects non-integer views", () => {
        expect(() => calculatePayout(1500.5, 500)).toThrow();
    });
});