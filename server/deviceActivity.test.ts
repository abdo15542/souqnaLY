import { describe, expect, it } from "vitest";
import { addDeviceActivity, getDeviceActivityLabel, searchDeviceRecords } from "../client/src/lib/deviceActivity";

describe("device activity", () => {
  it("adds latest activity first and keeps a bounded history", () => {
    const first = addDeviceActivity([], { id: "a1", createdAt: "2026-08-01T00:00:00.000Z", deviceId: "device-1", username: "cash-1", action: "issued" });
    const next = addDeviceActivity(first, { id: "a2", createdAt: "2026-08-02T00:00:00.000Z", deviceId: "device-1", username: "cash-1", action: "renewed" });
    expect(next.map((entry) => entry.action)).toEqual(["renewed", "issued"]);
  });

  it("searches by username or a piece of device identifier", () => {
    const records = [{ deviceId: "device-98ab", username: "cash-1" }, { deviceId: "device-00ff", username: "sale-2" }];
    expect(searchDeviceRecords(records, "cash")).toHaveLength(1);
    expect(searchDeviceRecords(records, "98ab")).toHaveLength(1);
  });

  it("labels activity actions for the owner log", () => {
    expect(getDeviceActivityLabel("deactivation_issued")).toBe("إصدار رمز تعطيل");
  });
});
