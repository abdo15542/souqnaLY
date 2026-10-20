import { describe, expect, it } from "vitest";
import { filterEmployeeAdvances, getAdvanceOutstanding, getEmployeeAdvanceTotal, isValidPayrollMonth, type EmployeeAdvance } from "../client/src/lib/employeeAdvances";
import { getEmployeeStatement } from "../client/src/lib/employeeStatement";

const advances: EmployeeAdvance[] = [
  { id: "a1", staffMemberId: "s1", staffMemberName: "أحمد", type: "cash", description: "سلفة أسبوعية", amount: 100, month: "2026-08", createdAt: "2026-08-01T10:00:00.000Z", settled: 20, note: "" },
  { id: "a2", staffMemberId: "s1", staffMemberName: "أحمد", type: "goods", description: "بضاعة", amount: 55, quantity: 2, productId: "p1", productName: "ماء", month: "2026-08", createdAt: "2026-08-02T10:00:00.000Z", settled: 0, note: "" },
  { id: "a3", staffMemberId: "s2", staffMemberName: "سالم", type: "clothing", description: "ملابس عمل", amount: 80, month: "2026-08", createdAt: "2026-08-03T10:00:00.000Z", settled: 0, note: "" },
  { id: "a4", staffMemberId: "s1", staffMemberName: "أحمد", type: "cash", description: "سلفة قديمة", amount: 40, month: "2026-07", createdAt: "2026-07-01T10:00:00.000Z", settled: 0, note: "" },
];

describe("employee advances", () => {
  it("calculates only the outstanding balance", () => {
    expect(getAdvanceOutstanding(advances[0])).toBe(80);
    expect(getEmployeeAdvanceTotal(advances, "s1", "2026-08")).toBe(135);
  });

  it("filters by month and Arabic search text", () => {
    expect(filterEmployeeAdvances(advances, "ماء", "2026-08").map((advance) => advance.id)).toEqual(["a2"]);
    expect(filterEmployeeAdvances(advances, "أحمد", "2026-07").map((advance) => advance.id)).toEqual(["a4"]);
  });

  it("accepts the standardized month value from mobile month inputs", () => {
    expect(isValidPayrollMonth("2026-08")).toBe(true);
    expect(isValidPayrollMonth("أغسطس 2026")).toBe(false);
  });

  it("shows employee purchase invoices once alongside standalone advances", () => {
    const purchaseAdvance: EmployeeAdvance = { id: "a5", staffMemberId: "s1", staffMemberName: "أحمد", type: "employee_purchase", description: "فاتورة مشتريات", amount: 75, month: "2026-08", createdAt: "2026-08-04T10:00:00.000Z", settled: 0, saleId: "sale-01", note: "" };
    const statement = getEmployeeStatement("s1", [{ id: "sale-01", createdAt: "2026-08-04T10:00:00.000Z", total: 75, employeePurchaseStaffMemberId: "s1" }], [advances[0], purchaseAdvance]);
    expect(statement.invoices).toBe(1);
    expect(statement.advances).toBe(1);
    expect(statement.outstanding).toBe(155);
  });

  it("keeps settled invoices in history while removing them from the outstanding balance", () => {
    const settledPurchase: EmployeeAdvance = { id: "a6", staffMemberId: "s1", staffMemberName: "أحمد", type: "employee_purchase", description: "فاتورة مسددة", amount: 60, month: "2026-08", createdAt: "2026-08-05T10:00:00.000Z", settled: 60, saleId: "sale-02", note: "" };
    const statement = getEmployeeStatement("s1", [{ id: "sale-02", createdAt: "2026-08-05T10:00:00.000Z", total: 60, employeePurchaseStaffMemberId: "s1" }], [settledPurchase]);
    expect(statement.recordedTotal).toBe(60);
    expect(statement.outstanding).toBe(0);
    expect(statement.entries[0].outstanding).toBe(0);
  });

  it("records an employee purchase return without increasing the outstanding balance", () => {
    const partiallyReturned: EmployeeAdvance = { id: "a7", staffMemberId: "s1", staffMemberName: "أحمد", type: "employee_purchase", description: "فاتورة جزئية", amount: 100, month: "2026-08", createdAt: "2026-08-06T10:00:00.000Z", settled: 30, saleId: "sale-03", note: "" };
    const statement = getEmployeeStatement("s1", [
      { id: "sale-03", createdAt: "2026-08-06T10:00:00.000Z", total: 100, employeePurchaseStaffMemberId: "s1" },
      { id: "return-03", createdAt: "2026-08-07T10:00:00.000Z", total: -30, employeePurchaseStaffMemberId: "s1", isReturn: true, returnOfSaleId: "sale-03", returnReason: "إرجاع جزئي" },
    ], [partiallyReturned]);
    expect(statement.recordedTotal).toBe(70);
    expect(statement.outstanding).toBe(70);
    expect(statement.entries.some((entry) => entry.type === "إرجاع بضاعة")).toBe(true);
  });
});
