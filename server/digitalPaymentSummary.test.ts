import { describe, expect, it } from "vitest";
import { getDigitalPaymentSummary } from "../client/src/lib/digitalPaymentSummary";

describe("digital payment summary", () => {
  it("يفصل البطاقة والتحويل حسب البنك والجهاز ويخصم الإرجاعات", () => {
    const rows = getDigitalPaymentSummary([
      { createdAt: "2026-08-25T08:00:00.000Z", paymentMethod: "card", total: 100, bankName: "مصرف الجمهورية", posTerminalType: "POS-01" },
      { createdAt: "2026-08-25T09:00:00.000Z", paymentMethod: "card", total: -20, isReturn: true, bankName: "مصرف الجمهورية", posTerminalType: "POS-01" },
      { createdAt: "2026-08-25T10:00:00.000Z", paymentMethod: "transfer", total: 75, bankName: "مصرف الوحدة", posTerminalType: "تطبيق المصرف" },
    ], "2026-08-25");
    expect(rows).toEqual([
      { paymentMethod: "card", label: "بطاقة مصرفية", bankName: "مصرف الجمهورية", posTerminalType: "POS-01", saleReceipts: 1, returnReceipts: 1, grossSales: 100, returnedValue: 20, netSales: 80 },
      { paymentMethod: "transfer", label: "تحويل مصرفي", bankName: "مصرف الوحدة", posTerminalType: "تطبيق المصرف", saleReceipts: 1, returnReceipts: 0, grossSales: 75, returnedValue: 0, netSales: 75 },
    ]);
  });
});
