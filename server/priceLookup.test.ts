import { describe, expect, it } from "vitest";
import { appendPriceLookupHistory, findPriceLookupProduct, PRICE_LOOKUP_HISTORY_LIMIT, type PriceLookupEntry } from "../client/src/lib/priceLookup";

const products = [
  { id: "water", name: "ماء معدني", sku: "625-100", salePrice: 2.5, quantity: 12, category: "مشروبات", barcodeAliases: ["625 101"] },
  { id: "juice", name: "عصير برتقال", sku: "625-200", salePrice: 4, quantity: 0, category: "مشروبات" },
];

describe("استعلام السعر المحلي", () => {
  it("يعثر على الصنف عبر الرمز الأصلي أو البديل حتى مع المسافات والشرطات", () => {
    expect(findPriceLookupProduct(products, "625100")?.id).toBe("water");
    expect(findPriceLookupProduct(products, "625-101")?.id).toBe("water");
  });

  it("يدعم البحث بالاسم ويحفظ آخر الاستعلامات ضمن الحد المحلي", () => {
    expect(findPriceLookupProduct(products, "برتقال")?.id).toBe("juice");
    const entries = Array.from({ length: PRICE_LOOKUP_HISTORY_LIMIT + 2 }, (_, index): PriceLookupEntry => ({ id: String(index), query: String(index), productId: String(index), productName: "صنف", found: true, lookedUpAt: "2026-08-25T00:00:00.000Z" }));
    const history = entries.reduce((current, entry) => appendPriceLookupHistory(current, entry), [] as PriceLookupEntry[]);
    expect(history).toHaveLength(PRICE_LOOKUP_HISTORY_LIMIT);
    expect(history[0]?.id).toBe(String(PRICE_LOOKUP_HISTORY_LIMIT + 1));
  });
});
