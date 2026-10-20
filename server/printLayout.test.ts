import { describe, expect, it } from "vitest";
import { getPrintLayout } from "../client/src/lib/printLayout";
import { getThermalReceiptStyleOverrides } from "../client/src/lib/thermalReceiptStyle";

describe("تخطيط طباعة سوقنا", () => {
  it("يضبط إيصال 58 مم للطابعة الحرارية", () => {
    expect(getPrintLayout("58")).toMatchObject({ pageSize: "58mm auto", contentWidth: "58mm", isA4: false });
  });

  it("يضبط إيصال 80 مم للطابعة الحرارية", () => {
    expect(getPrintLayout("80")).toMatchObject({ pageSize: "80mm auto", contentWidth: "80mm", isA4: false });
  });

  it("يضبط ورقة A4 للطابعة العادية", () => {
    expect(getPrintLayout("A4")).toMatchObject({ pageSize: "A4", contentWidth: "190mm", isA4: true });
  });

  it("يطبع الإيصال الحراري بتباين عالٍ مع رمز QR واضح ودون شعار", () => {
    const thermalStyle = getThermalReceiptStyleOverrides(false);
    expect(thermalStyle).toContain("color:#000!important");
    expect(thermalStyle).toContain(".receipt-brand img{display:none!important}");
    expect(thermalStyle).toContain(".receipt-qr img{display:block!important;width:28mm!important");
    expect(getThermalReceiptStyleOverrides(true)).toBe("");
  });

  it("يطبق حجم الخط ودرجة الوضوح المختارين للطابعات الحرارية", () => {
    const compactStyle = getThermalReceiptStyleOverrides(false, { textSize: "small", clarity: "standard" });
    const clearStyle = getThermalReceiptStyleOverrides(false, { textSize: "large", clarity: "maximum" });
    expect(compactStyle).toContain("font-size:12px!important");
    expect(compactStyle).toContain("font-weight:700!important");
    expect(clearStyle).toContain("font-size:16px!important");
    expect(clearStyle).toContain("font-weight:900!important");
    expect(clearStyle).toContain("border-bottom:4px solid #000!important");
  });
});
