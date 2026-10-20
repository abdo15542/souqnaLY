import { describe, expect, it } from "vitest";
import { filterPayrollRecords, getPayrollNet, getPayrollSummary, type PayrollRecord } from "@/lib/payroll";
import { getOperatingExpenseReport } from "@/lib/operatingExpenseReport";

const records: PayrollRecord[] = [
  { id: "1", staffMemberId: "a", staffMemberName: "أحمد", month: "2026-08", baseSalary: 1200, advances: 100, deductions: 50, paidAmount: 1050, paymentMethod: "cash", note: "راتب الشهر", paidAt: "2026-08-31T10:00:00.000Z" },
  { id: "2", staffMemberId: "b", staffMemberName: "سالم", month: "2026-08", baseSalary: 900, advances: 0, deductions: 25, paidAmount: 500, paymentMethod: "transfer", note: "دفعة أولى", paidAt: "2026-08-30T10:00:00.000Z" },
];

describe("payroll and operating expense reports", () => {
  it("calculates net payroll and monthly totals", () => {
    expect(getPayrollNet(records[0])).toBe(1050);
    expect(getPayrollNet({ baseSalary: 1500, advances: 55, deductions: 88 })).toBe(1357);
    expect(288).toBeLessThanOrEqual(1357);
    expect(getPayrollSummary(records, "2026-08")).toEqual({ baseSalary: 2100, advances: 100, deductions: 75, paidAmount: 1550, netDue: 1925 });
    expect(filterPayrollRecords(records, "سالم", "2026-08").map((record) => record.staffMemberName)).toEqual(["سالم"]);
  });

  it("groups operating expenses by category and month", () => {
    expect(getOperatingExpenseReport([{ amount: 20, category: "نقل", spentAt: "2026-08-01T12:00:00.000Z", note: "توصيل" }, { amount: 30, category: "نقل", spentAt: "2026-08-02T12:00:00.000Z" }, { amount: 100, category: "صيانة", spentAt: "2026-07-02T12:00:00.000Z" }], "2026-08")).toEqual([{ category: "نقل", total: 50, count: 2, notes: ["توصيل"] }]);
  });
});
