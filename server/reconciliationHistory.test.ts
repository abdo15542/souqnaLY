import { describe, expect, it } from "vitest";
import { filterReconciliationHistory } from "../client/src/lib/reconciliationHistory";

const entries = [
  { id: "old", date: "2026-08-23", paymentMethod: "card" as const, posTotal: 100, bankStatementTotal: 100, difference: 0, note: "تم التحقق", reviewedAt: "2026-08-23T19:00:00.000Z" },
  { id: "new", date: "2026-08-25", paymentMethod: "transfer" as const, posTotal: 80, bankStatementTotal: 75, difference: -5, note: "فرق كشف المصرف", reviewedAt: "2026-08-25T19:00:00.000Z" },
];

describe("reconciliation history", () => {
  it("يبحث ويفلتر حسب الطريقة والحالة ويرتب الأحدث أولًا", () => {
    expect(filterReconciliationHistory(entries, "كشف", "transfer", "difference").map((entry) => entry.id)).toEqual(["new"]);
    expect(filterReconciliationHistory(entries, "", "all", "matched").map((entry) => entry.id)).toEqual(["old"]);
    expect(filterReconciliationHistory(entries, "", "all", "all").map((entry) => entry.id)).toEqual(["new", "old"]);
  });
});
