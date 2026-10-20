import { describe, expect, it } from "vitest";
import { getCurrentStaffDailySummary } from "../client/src/lib/currentStaffDailySummary";

describe("getCurrentStaffDailySummary", () => {
  it("calculates sales, returns, units, and values for the selected staff member only", () => {
    const summary = getCurrentStaffDailySummary(
      [
        { staffMemberId: "staff-1", total: 25, items: [{ quantity: 2 }] },
        { staffMemberId: "staff-1", isReturn: true, total: -7, items: [{ quantity: -1 }, { quantity: -2 }] },
        { staffMemberId: "staff-2", total: 100, items: [{ quantity: 9 }] },
      ],
      "staff-1",
    );

    expect(summary).toEqual({
      salesInvoices: 1,
      salesValue: 25,
      returnInvoices: 1,
      returnUnits: 3,
      returnValue: 7,
    });
  });

  it("returns an empty summary when the staff member has no movements", () => {
    expect(getCurrentStaffDailySummary([], "staff-unknown")).toEqual({
      salesInvoices: 0,
      salesValue: 0,
      returnInvoices: 0,
      returnUnits: 0,
      returnValue: 0,
    });
  });
});
