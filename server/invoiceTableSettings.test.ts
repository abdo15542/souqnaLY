import { cycleInvoiceTableScale, DEFAULT_INVOICE_TABLE_SETTINGS, parseInvoiceTableSettings } from "../client/src/lib/invoiceTableSettings";
import { describe, expect, it } from "vitest";

describe("invoice table settings", () => {
  it("uses the operational defaults for missing or invalid settings", () => {
    expect(parseInvoiceTableSettings(null)).toEqual(DEFAULT_INVOICE_TABLE_SETTINGS);
    expect(parseInvoiceTableSettings("bad-json")).toEqual(DEFAULT_INVOICE_TABLE_SETTINGS);
  });

  it("keeps valid visibility choices and ignores malformed values", () => {
    const settings = parseInvoiceTableSettings('{"scale":"extra-large","focusMode":true,"columns":{"package":false,"unit-price":true,"total":"yes"}}');
    expect(settings.scale).toBe("extra-large");
    expect(settings.focusMode).toBe(true);
    expect(settings.columns.package).toBe(false);
    expect(settings.columns["unit-price"]).toBe(true);
    expect(settings.columns.total).toBe(true);
  });

  it("cycles table size safely at both limits", () => {
    expect(cycleInvoiceTableScale("normal", "decrease")).toBe("normal");
    expect(cycleInvoiceTableScale("large", "increase")).toBe("extra-large");
    expect(cycleInvoiceTableScale("extra-large", "increase")).toBe("extra-large");
  });
});
