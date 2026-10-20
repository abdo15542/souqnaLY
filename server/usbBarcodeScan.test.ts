import { describe, expect, it } from "vitest";
import { getUsbBarcodeValue } from "../client/src/lib/usbBarcodeScan";

describe("قارئ الباركود USB", () => {
  it("يقبل باركود قارئ USB السريع عند نهايته بزر Enter", () => {
    expect(getUsbBarcodeValue({ value: "  6281234567890  ", elapsedMs: 240 })).toBe("6281234567890");
  });

  it("يرفض الكتابة البطيئة أو النص القصير حتى لا يضيف أصنافًا بالخطأ", () => {
    expect(getUsbBarcodeValue({ value: "123456", elapsedMs: 1800 })).toBe("");
    expect(getUsbBarcodeValue({ value: "123", elapsedMs: 160 })).toBe("");
  });
});
