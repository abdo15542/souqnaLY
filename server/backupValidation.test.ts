import { describe, expect, it } from "vitest";
import { validateStoreBackup } from "../client/src/lib/backupValidation";

describe("فحص النسخ الاحتياطية", () => {
  it("يقبل نسخة متجر مكتملة ويعيد ملخصها", () => {
    expect(validateStoreBackup({
      storeName: "محل الاختبار",
      products: [{ id: "p-1", name: "حليب" }],
      sales: [{ id: "s-1", items: [] }],
      debts: [{ id: "d-1", customerName: "أحمد" }],
    })).toEqual({ valid: true, summary: { storeName: "محل الاختبار", products: 1, sales: 1, debts: 1 } });
  });

  it("يرفض الملفات غير المكتملة أو ذات المنتجات غير الصالحة", () => {
    expect(validateStoreBackup({ products: [], sales: [] })).toMatchObject({ valid: false });
    expect(validateStoreBackup({ products: [{ name: "" }], sales: [], debts: [] })).toEqual({ valid: false, reason: "يوجد صنف غير صالح داخل النسخة الاحتياطية." });
  });
});
