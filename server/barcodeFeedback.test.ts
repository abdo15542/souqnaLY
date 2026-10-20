import { describe, expect, it } from "vitest";
import { getBarcodeFeedbackMessage, getCartBarcodeFeedbackMessage } from "../client/src/lib/barcodeFeedback";

describe("تنبيهات مسح الباركود", () => {
  it("يوضح اسم الصنف والكمية الجديدة عند إضافته إلى سلة البيع", () => {
    expect(getCartBarcodeFeedbackMessage("sale", "ماء", 3)).toBe("تمت إضافة «ماء» إلى سلة البيع · الكمية الآن 3.");
  });

  it("يميّز سلة الإرجاع ورسالة الباركود غير المسجل", () => {
    expect(getCartBarcodeFeedbackMessage("return", "عصير", 2)).toContain("سلة الإرجاع");
    expect(getBarcodeFeedbackMessage("not-found")).toContain("غير مسجل");
  });
});
