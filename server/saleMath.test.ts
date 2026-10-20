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
    expect(decimalToMilliUnits("0.5")).toBe(500n);
    expect(decimalToMilliUnits("0.005")).toBe(5n);
    expect(milliUnitsToDecimal(12345n)).toBe("12.345");
    expect(milliUnitsToDecimal(0n)).toBe("0.000");
  });

  it("accepts the largest DECIMAL(12,3) value", () => {
    expect(decimalToMilliUnits("999999999.999")).toBe(999999999999n);
    expect(milliUnitsToDecimal(999999999999n)).toBe("999999999.999");
  });

  it("rejects invalid precision, signs, notation and out-of-range amounts", () => {
    for (const invalid of ["1.2345", "-1", "+1", "1e3", "", ".5", "1."]) {
      expect(() => decimalToMilliUnits(invalid), invalid).toThrow("Invalid monetary amount");
    }
    expect(() => milliUnitsToDecimal(1000000000000n)).toThrow("outside");
  });

  it("rejects invalid quantities", () => {
    expect(() => calculateSaleTotal([{ price: "2.000", quantity: 0 }])).toThrow("positive integer");
    expect(() => calculateSaleTotal([{ price: "2.000", quantity: 1.5 }])).toThrow("positive integer");
  });
});
