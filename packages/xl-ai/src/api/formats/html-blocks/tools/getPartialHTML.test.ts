import { describe, expect, it } from "vitest";
import { getPartialHTML } from "./getPartialHTML.js";

describe("getPartialHTML", () => {
  // Test cases from the function's documentation
  it("completes simple paragraph tag", () => {
    expect(getPartialHTML("<p>hello")).toBe("<p>hello</p>");
  });

  it("handles incomplete tag at the end", () => {
    expect(getPartialHTML("<p>hello <sp")).toBe("<p>hello </p>");
  });

  it("handles incomplete tag with content", () => {
    expect(getPartialHTML("<p>hello <span")).toBe("<p>hello </p>");
  });

  it("completes nested tags", () => {
    expect(getPartialHTML("<p>hello <span>")).toBe(
      "<p>hello <span></span></p>",
    );
  });

  it("completes nested tags with content", () => {
    expect(getPartialHTML("<p>hello <span>world")).toBe(
      "<p>hello <span>world</span></p>",
    );
  });

  it("leaves already complete HTML unchanged", () => {
    expect(getPartialHTML("<p>hello <span>world</span></p>")).toBe(
      "<p>hello <span>world</span></p>",
    );
  });

  // Additional test cases
  it("handles empty string", () => {
    expect(getPartialHTML("")).toBe("");
  });

  it("handles incomplete entity", () => {
    expect(getPartialHTML("<p>hello &")).toBe("<p>hello </p>");
  });

  it("handles incomplete entity with partial name", () => {
    expect(getPartialHTML("<p>hello &amp")).toBe("<p>hello </p>");
  });

  it("handles complete entity", () => {
    expect(getPartialHTML("<p>hello &amp;")).toBe("<p>hello &amp;</p>");
  });

  it("handles multiple nested tags", () => {
    expect(getPartialHTML("<div><p><span>hello")).toBe(
      "<div><p><span>hello</span></p></div>",
    );
  });

  it("handles self-closing tags", () => {
    expect(getPartialHTML('<div><img src="test.jpg">hello')).toBe(
      '<div><img src="test.jpg">hello</div>',
    );
  });

  it("handles self-closing tags (incomplete)", () => {
    expect(getPartialHTML('<div><img src="test.jpg"')).toBe("<div></div>");
  });

  it("returns undefined for only incomplete tag", () => {
    expect(getPartialHTML("<")).toBeUndefined();
  });

  it("handles attributes in incomplete tags", () => {
    expect(getPartialHTML('<p class="test"')).toBe(undefined);
  });
});
