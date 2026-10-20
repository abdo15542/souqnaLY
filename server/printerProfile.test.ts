import { describe, expect, it } from "vitest";
import { inferThermalPaperWidth, makeDetectedPrinterProfile } from "../client/src/lib/printerProfile";

describe("الملف العام للطابعة الحرارية", () => {
  it("يتعرف على طابعة 58 مم من اسمها", () => {
    expect(inferThermalPaperWidth("POS-58 Bluetooth")).toBe("58");
  });

  it("يفترض 80 مم للطابعات غير المعرّفة أو لطابعة 80 مم", () => {
    expect(inferThermalPaperWidth("Generic Thermal Printer")).toBe("80");
    expect(inferThermalPaperWidth("POS-80 USB")).toBe("80");
  });

  it("ينشئ ملفًا محليًا من الطابعة التي اختارها المستخدم", () => {
    expect(makeDetectedPrinterProfile("  Any Thermal USB  ", "usb")).toEqual({ deviceName: "Any Thermal USB", model: "Any Thermal USB", paperWidth: "80", connection: "usb" });
  });
});
