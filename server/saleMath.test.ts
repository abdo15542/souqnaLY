import { describe, expect, it } from "vitest";
import { calculateSaleTotal, decimalToMilliUnits, milliUnitsToDecimal } from "./saleMath";

describe("POS monetary arithmetic", () => {
  it("preserves three decimal places without floating-point drift", () => {
    expect(calculateSaleTotal([
      { price: "1.125", quantity: 3 },
      { price: "0.250", quantity: 2 },
    ])).toBe("3.875");
  });

  it("normalizes whole and fractional decimal values", () => {
    expect(decimalToMilliUnits("12")).toBe(12000n);
    expect(milliUnitsToDecimal(12345n)).toBe("12.345");
  });

  it("rejects invalid precision and out-of-range amounts", () => {
    expect(() => decimalToMilliUnits("1.2345")).toThrow("Invalid monetary amount");
    expect(() => milliUnitsToDecimal(1_000_000_000_000n)).toThrow("outside");
  });

  it("rejects invalid quantities", () => {
    expect(() => calculateSaleTotal([{ price: "2.000", quantity: 0 }])).toThrow("positive integer");
  });
});
