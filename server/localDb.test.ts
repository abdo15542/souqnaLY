import { describe, expect, it } from "vitest";
import { getLocalStorageFailureGuidance } from "../client/src/lib/localDb";

describe("إرشاد فشل التخزين المحلي", () => {
  it("يفسر حد سعة بيانات المتصفح دون اتهام مساحة الهاتف كاملة", () => {
    expect(getLocalStorageFailureGuidance({ name: "QuotaExceededError" })).toContain("مساحة بيانات هذا الموقع في المتصفح");
  });

  it("يعرض إرشاد استرداد آمنًا للأخطاء المحلية الأخرى", () => {
    expect(getLocalStorageFailureGuidance(new Error("blocked"))).toContain("بياناتك الحالية لم تُحذف");
  });
});
