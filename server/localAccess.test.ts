import { describe, expect, it } from "vitest";
import { activateDevice, canDeactivateDevice, createActivationPayload, createDeactivationPayload, createDeviceRequest, decodeLocalAccessCode, encodeLocalAccessCode, getAccessExpiryNotice, isAccessExpired, isOwnerSetupPhone, verifyLocalAccessLogin } from "../client/src/lib/localAccess";

describe("local device access", () => {
  it("allows owner setup only from a phone and keeps desktop devices in user-link mode", () => {
    expect(isOwnerSetupPhone("Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/120.0 Mobile Safari/537.36")).toBe(true);
    expect(isOwnerSetupPhone("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36")).toBe(false);
  });

  it("binds an activation payload to the requesting device only", async () => {
    const first = await createDeviceRequest("device-a");
    const second = await createDeviceRequest("device-b");
    const payload = await createActivationPayload(first.request, "cashier", "secret123", "2030-01-01T00:00:00.000Z");
    expect(activateDevice(payload, first.deviceId, first.request.deviceProof)?.username).toBe("cashier");
    expect(activateDevice(payload, second.deviceId, second.request.deviceProof)).toBeNull();
  });

  it("round-trips manual codes and verifies credentials before expiry", async () => {
    const target = await createDeviceRequest("device-c");
    const payload = await createActivationPayload(target.request, "worker", "pass1234", "2030-01-01T00:00:00.000Z");
    const restored = decodeLocalAccessCode(encodeLocalAccessCode(payload));
    const profile = restored && activateDevice(restored, target.deviceId, target.request.deviceProof);
    expect(profile && await verifyLocalAccessLogin(profile, "worker", "pass1234")).toBe(true);
    expect(profile && await verifyLocalAccessLogin(profile, "worker", "wrong")).toBe(false);
    expect(isAccessExpired({ expiresAt: "2000-01-01T00:00:00.000Z" })).toBe(true);
  });

  it("accepts a deactivation only on the device it was issued for", async () => {
    const first = await createDeviceRequest("device-d");
    const second = await createDeviceRequest("device-e");
    const code = createDeactivationPayload(first.deviceId, first.request.deviceProof, "انتهت الحاجة للجهاز");
    expect(canDeactivateDevice(code, first.deviceId, first.request.deviceProof)).toBe(true);
    expect(canDeactivateDevice(code, second.deviceId, second.request.deviceProof)).toBe(false);
    expect(code.reason).toBe("انتهت الحاجة للجهاز");
  });

  it("categorizes the seven, three and one day expiry notices", () => {
    const now = Date.parse("2030-01-01T00:00:00.000Z");
    expect(getAccessExpiryNotice({ expiresAt: "2030-01-08T00:00:00.000Z" }, now)).toEqual({ daysRemaining: 7, level: "info" });
    expect(getAccessExpiryNotice({ expiresAt: "2030-01-04T00:00:00.000Z" }, now)).toEqual({ daysRemaining: 3, level: "warning" });
    expect(getAccessExpiryNotice({ expiresAt: "2030-01-02T00:00:00.000Z" }, now)).toEqual({ daysRemaining: 1, level: "urgent" });
    expect(getAccessExpiryNotice({ expiresAt: "2030-01-10T00:00:00.000Z" }, now)).toBeNull();
  });
});
