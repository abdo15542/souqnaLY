import { describe, expect, it } from "vitest";
import { getUpdateStatus } from "../client/src/lib/appUpdate";

describe("app update status", () => {
  it("does not show an update on the first successful version check", () => {
    expect(getUpdateStatus(null, "v1")).toBe("first-check");
  });

  it("detects a published version different from the running version", () => {
    expect(getUpdateStatus("v1", "v2")).toBe("available");
    expect(getUpdateStatus("v2", "v2")).toBe("current");
  });
});
