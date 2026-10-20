import { describe, expect, it } from "vitest";
import { getReceiptLogoSizing, getReceiptLogoSource, isReceiptLogoDataUrl } from "../client/src/lib/receiptLogo";

describe("شعار الإيصال المحلي", () => {
  const defaultLogo = "/manus-storage/souqna-logo.png";
  const pngLogo = "data:image/png;base64,AA==";

  it("يقبل صور PNG وJPEG وWebP بصيغة data URL فقط", () => {
    expect(isReceiptLogoDataUrl(pngLogo)).toBe(true);
    expect(isReceiptLogoDataUrl("data:image/jpeg;base64,AA==")).toBe(true);
    expect(isReceiptLogoDataUrl("data:image/webp;base64,AA==")).toBe(true);
    expect(isReceiptLogoDataUrl("https://example.test/logo.png")).toBe(false);
    expect(isReceiptLogoDataUrl("data:image/svg+xml;base64,AA==")).toBe(false);
  });

  it("يستخدم الشعار الافتراضي عند غياب شعار محلي صالح", () => {
    expect(getReceiptLogoSource(pngLogo, defaultLogo)).toBe(pngLogo);
    expect(getReceiptLogoSource("", defaultLogo)).toBe(defaultLogo);
    expect(getReceiptLogoSource("https://example.test/logo.png", defaultLogo)).toBe(defaultLogo);
  });

  it("يحافظ على الشعارات العريضة والمربعة داخل حدود طباعة متناسبة", () => {
    expect(getReceiptLogoSizing("58")).toEqual({ maxWidthMm: 30, maxHeightMm: 16, objectFit: "contain" });
    expect(getReceiptLogoSizing("80")).toEqual({ maxWidthMm: 42, maxHeightMm: 16, objectFit: "contain" });
    expect(getReceiptLogoSizing("A4")).toEqual({ maxWidthMm: 42, maxHeightMm: 20, objectFit: "contain" });
  });
});
