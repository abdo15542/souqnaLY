import { describe, expect, it } from "vitest";
import { getIssuedDeviceStatus, getIssuedDeviceVisualState, upsertIssuedDevice } from "../client/src/lib/issuedDevices";

describe("issued devices", () => {
  it("replaces an old issue for the same device during renewal", () => {
    const first = { deviceId: "d1", deviceProof: "p1", username: "cashier", expiresAt: "2026-09-01T00:00:00.000Z", issuedAt: "2026-08-01T00:00:00.000Z" };
    const renewed = { ...first, expiresAt: "2026-10-01T00:00:00.000Z", issuedAt: "2026-08-20T00:00:00.000Z" };
    expect(upsertIssuedDevice([first], renewed)).toEqual([renewed]);
  });

  it("marks expired and active device records correctly", () => {
    expect(getIssuedDeviceStatus({ deviceId: "d1", deviceProof: "p", username: "u", issuedAt: "2026-01-01T00:00:00.000Z", expiresAt: "2026-01-02T00:00:00.000Z" }, Date.parse("2026-02-01T00:00:00.000Z"))).toBe("expired");
    expect(getIssuedDeviceStatus({ deviceId: "d2", deviceProof: "p", username: "u", issuedAt: "2026-01-01T00:00:00.000Z", expiresAt: "2026-03-01T00:00:00.000Z" }, Date.parse("2026-02-01T00:00:00.000Z"))).toBe("active");
  });

  it("assigns a visual alert level from remaining days", () => {
    const record = { deviceId: "d3", deviceProof: "p", username: "u", issuedAt: "2026-01-01T00:00:00.000Z", expiresAt: "2026-02-08T00:00:00.000Z" };
    const now = Date.parse("2026-02-01T00:00:00.000Z");
    expect(getIssuedDeviceVisualState(record, now)).toEqual({ state: "near", daysRemaining: 7 });
    expect(getIssuedDeviceVisualState({ ...record, expiresAt: "2026-02-04T00:00:00.000Z" }, now)).toEqual({ state: "warning", daysRemaining: 3 });
    expect(getIssuedDeviceVisualState({ ...record, expiresAt: "2026-02-02T00:00:00.000Z" }, now)).toEqual({ state: "urgent", daysRemaining: 1 });
  });
});
