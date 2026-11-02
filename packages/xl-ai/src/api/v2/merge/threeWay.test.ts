import { describe, expect, it } from "vite-plus/test";

import { mergeRecords, mergeValue } from "./threeWay.js";

describe("mergeValue", () => {
  it("gives the value of theirs if ours did not change", () => {
    expect(mergeValue("default", "default", "red")).toBe("red");
  });

  it("gives the value of ours if it changed", () => {
    expect(mergeValue("default", "blue", "red")).toBe("blue");
  });

  it("compares objects by value", () => {
    const theirs = { level: 3 };
    expect(mergeValue({ level: 2 }, { level: 2 }, theirs)).toBe(theirs);
  });
});

describe("mergeRecords", () => {
  it("merges each key", () => {
    expect(
      mergeRecords(
        { bold: true, textColor: "default" },
        { bold: undefined, textColor: "default" },
        { bold: true, textColor: "red", underline: true },
      ),
    ).toEqual({ textColor: "red", underline: true });
  });
});
