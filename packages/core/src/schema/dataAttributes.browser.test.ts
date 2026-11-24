import { describe, expect, it } from "vite-plus/test";
import { applyDataAttributes, setDataAttributes } from "./dataAttributes.js";

describe("setDataAttributes", () => {
  it("sets the attributes and removes nothing", () => {
    const element = document.createElement("div");
    element.setAttribute("data-checked", "author");

    setDataAttributes(element, { "data-text-alignment": "center" });

    expect(element.getAttribute("data-text-alignment")).toBe("center");
    expect(element.getAttribute("data-checked")).toBe("author");
  });
});

describe("applyDataAttributes", () => {
  it("sets non-default props and removes the attributes of the others", () => {
    const element = document.createElement("div");
    element.setAttribute("data-text-alignment", "center");
    element.setAttribute("data-checked", "author");
    element.setAttribute("data-other", "kept");

    applyDataAttributes(
      element,
      { previewWidth: 100 },
      {
        textAlignment: { default: "left", values: ["left", "center"] },
        previewWidth: { default: undefined, type: "number" },
        checked: { default: false },
      },
    );

    expect(element.getAttribute("data-preview-width")).toBe("100");
    expect(element.hasAttribute("data-text-alignment")).toBe(false);
    expect(element.hasAttribute("data-checked")).toBe(false);
    expect(element.getAttribute("data-other")).toBe("kept");
  });
});
