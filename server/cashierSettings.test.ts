import { describe, expect, it } from "vitest";
import { DEFAULT_CASHIER_SETTINGS, getDesktopInvoiceFunctionKey, matchesCashierShortcut, parseCashierSettings, updateCashierShortcut } from "../client/src/lib/cashierSettings";

describe("cashier settings", () => {
  it("uses safe defaults for missing or invalid saved settings", () => {
    expect(parseCashierSettings(null)).toEqual(DEFAULT_CASHIER_SETTINGS);
    expect(parseCashierSettings("not-json")).toEqual(DEFAULT_CASHIER_SETTINGS);
  });

  it("keeps only valid unique shortcuts from local settings", () => {
    const settings = parseCashierSettings('{"fontScale":"large","cartWidth":"wide","cartImageScale":"large","showCartCode":false,"showCartStock":true,"shortcuts":{"focus-search":"F3","open-scanner":"F3","confirm-sale":"Alt+Enter"}}');
    expect(settings.fontScale).toBe("large");
    expect(settings.cartWidth).toBe("wide");
    expect(settings.cartImageScale).toBe("large");
    expect(settings.showCartCode).toBe(false);
    expect(settings.showCartStock).toBe(true);
    expect(settings.shortcuts["focus-search"]).toBe("F3");
    expect(settings.shortcuts["open-scanner"]).toBe("F2");
    expect(settings.shortcuts["confirm-sale"]).toBe("Alt+Enter");
  });

  it("falls back to the standard cart width for an invalid local choice", () => {
    expect(parseCashierSettings('{"cartWidth":"huge"}').cartWidth).toBe("standard");
  });

  it("uses safe image and column defaults for older local cashier settings", () => {
    const settings = parseCashierSettings('{"cartImageScale":"huge"}');
    expect(settings.cartImageScale).toBe("medium");
    expect(settings.showCartCode).toBe(true);
    expect(settings.showCartStock).toBe(true);
  });

  it("clears an existing action when its shortcut is reassigned", () => {
    const next = updateCashierShortcut(DEFAULT_CASHIER_SETTINGS, "open-scanner", "F2");
    expect(next.shortcuts["open-scanner"]).toBe("F2");
    expect(next.shortcuts["focus-search"]).toBe("F1");
    expect(next.shortcuts["open-scanner"]).toBe("F2");
  });

  it("lets the cashier reassign any desktop invoice key without collisions", () => {
    const next = updateCashierShortcut(DEFAULT_CASHIER_SETTINGS, "print-invoice", "F4");
    expect(next.shortcuts["print-invoice"]).toBe("F4");
    expect(next.shortcuts["confirm-sale"]).toBe("none");
  });

  it("matches function and modifier shortcuts without matching plain typing", () => {
    expect(matchesCashierShortcut({ key: "F2", altKey: false, ctrlKey: false, metaKey: false }, "F2")).toBe(true);
    expect(matchesCashierShortcut({ key: "b", altKey: true, ctrlKey: false, metaKey: false }, "Alt+B")).toBe(true);
    expect(matchesCashierShortcut({ key: "b", altKey: false, ctrlKey: false, metaKey: false }, "Alt+B")).toBe(false);
  });

  it("recognizes only plain desktop invoice function keys", () => {
    expect(getDesktopInvoiceFunctionKey({ key: "F1", altKey: false, ctrlKey: false, metaKey: false })).toBe("F1");
    expect(getDesktopInvoiceFunctionKey({ key: "f12", altKey: false, ctrlKey: false, metaKey: false })).toBe("F12");
    expect(getDesktopInvoiceFunctionKey({ key: "F4", altKey: true, ctrlKey: false, metaKey: false })).toBeNull();
    expect(getDesktopInvoiceFunctionKey({ key: "A", altKey: false, ctrlKey: false, metaKey: false })).toBeNull();
  });
});
