import { describe, expect, it } from "vitest";
import { calculateSaleTotals } from "../client/src/lib/saleTotals";

describe("حساب إجمالي فاتورة سوقنا", () => {
  it("يبقي الإجمالي والربح دون تغيير عندما يكون الخصم صفرًا", () => {
    expect(calculateSaleTotals(100, 65, 0)).toEqual({ subtotal: 100, discountPercent: 0, discountAmount: 0, total: 100, profit: 35 });
  });

  it("يخصم النسبة الافتراضية من الإجمالي والربح", () => {
    expect(calculateSaleTotals(100, 65, 10)).toEqual({ subtotal: 100, discountPercent: 10, discountAmount: 10, total: 90, profit: 25 });
  });

  it("يحد النسبة إلى مئة بالمئة ولا ينتج إجماليًا سالبًا", () => {
    expect(calculateSaleTotals(42, 20, 150)).toMatchObject({ discountPercent: 100, discountAmount: 42, total: 0, profit: -20 });
  });
});
