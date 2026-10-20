import { describe, expect, it } from "vitest";
import { addScannedProductToCart } from "../client/src/lib/scannedCartQuantity";

describe("زيادة كمية الباركود المتكرر", () => {
  const water = { id: "water", name: "ماء", quantity: 3 };

  it("يزيد كمية السطر نفسه مع كل مسح بدل إنشاء سطر مكرر", () => {
    const first = addScannedProductToCart([], water);
    const second = addScannedProductToCart(first.cart, water);
    expect(second.cart).toHaveLength(1);
    expect(second.cart[0].cartQuantity).toBe(2);
    expect(second.quantity).toBe(2);
  });

  it("لا يسمح للمسح المتكرر بتجاوز كمية المخزون", () => {
    const fullCart = [{ ...water, cartQuantity: 3 }];
    const result = addScannedProductToCart(fullCart, water);
    expect(result.added).toBe(false);
    expect(result.cart[0].cartQuantity).toBe(3);
  });
});
