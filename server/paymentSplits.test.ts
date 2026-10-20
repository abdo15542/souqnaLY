import { describe, expect, it } from "vitest";
import { getPaymentSplitsTotal, getPaymentSplitsLabel, normalizePaymentSplits } from "../client/src/lib/paymentSplits";

describe("payment splits", () => {
  it("يحسب تقسيم الفاتورة ويحافظ على تفاصيل الدفع الإلكتروني", () => {
    const splits = normalizePaymentSplits([
      { paymentMethod: "cash", amount: 50 },
      { paymentMethod: "card", amount: 35, bankName: " مصرف الجمهورية ", posTerminalType: " POS-01 " },
    ], 85);
    expect(getPaymentSplitsTotal(splits)).toBe(85);
    expect(splits[1]).toEqual({ paymentMethod: "card", amount: 35, bankName: "مصرف الجمهورية", posTerminalType: "POS-01" });
    expect(getPaymentSplitsLabel(splits)).toContain("نقدًا: 50.00 د.ل");
  });
});
