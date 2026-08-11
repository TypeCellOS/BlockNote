import { describe, expect, it } from "vite-plus/test";

import { applyMathVariant } from "./mathVariants.js";

describe("applyMathVariant", () => {
  it("maps bold, bold-italic, and normal to run styles", () => {
    expect(applyMathVariant("v", "bold")).toEqual({ text: "v", style: "b" });
    expect(applyMathVariant("α", "bold-italic")).toEqual({
      text: "α",
      style: "bi",
    });
    expect(applyMathVariant("d", "normal")).toEqual({ text: "d", style: "p" });
  });

  it("leaves default and italic text unchanged", () => {
    expect(applyMathVariant("x", undefined)).toEqual({ text: "x" });
    expect(applyMathVariant("x", "italic")).toEqual({ text: "x" });
  });

  it("maps double-struck letters, including Letterlike exceptions", () => {
    expect(applyMathVariant("R", "double-struck").text).toBe("ℝ");
    expect(applyMathVariant("C", "double-struck").text).toBe("ℂ");
    expect(applyMathVariant("a", "double-struck").text).toBe("𝕒");
    expect(applyMathVariant("1", "double-struck").text).toBe("𝟙");
  });

  it("maps script letters, including Letterlike exceptions", () => {
    expect(applyMathVariant("L", "script").text).toBe("ℒ");
    expect(applyMathVariant("e", "script").text).toBe("ℯ");
    expect(applyMathVariant("A", "script").text).toBe("𝒜");
  });

  it("maps fraktur letters, including Letterlike exceptions", () => {
    expect(applyMathVariant("R", "fraktur").text).toBe("ℜ");
    expect(applyMathVariant("g", "fraktur").text).toBe("𝔤");
  });

  it("maps sans-serif and monospace", () => {
    expect(applyMathVariant("A", "sans-serif").text).toBe("𝖠");
    expect(applyMathVariant("x", "monospace").text).toBe("𝚡");
    expect(applyMathVariant("0", "monospace").text).toBe("𝟶");
  });

  it("keeps characters without a variant form unchanged", () => {
    expect(applyMathVariant("∞", "normal")).toEqual({
      text: "∞",
      style: "p",
    });
    expect(applyMathVariant("α", "double-struck").text).toBe("α");
  });

  it("keeps text with an unknown variant unchanged", () => {
    expect(applyMathVariant("x", "initial")).toEqual({ text: "x" });
  });
});
