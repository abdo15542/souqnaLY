import { describe, expect, it } from "vitest";
import { getTrainingModeMessage, shouldPersistStoreChange } from "../client/src/lib/trainingMode";

describe("training mode", () => {
  it("does not allow store changes to persist while training is active", () => {
    expect(shouldPersistStoreChange(true)).toBe(false);
    expect(shouldPersistStoreChange(false)).toBe(true);
  });

  it("clearly explains whether transactions are isolated", () => {
    expect(getTrainingModeMessage(true)).toContain("لا تُحفظ");
    expect(getTrainingModeMessage(false)).toContain("تحفظ");
  });
});
