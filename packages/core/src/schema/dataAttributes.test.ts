import { describe, expect, it } from "vite-plus/test";

import {
  applyDataAttributes,
  propsToDataAttributes,
  setDataAttributes,
} from "./dataAttributes.js";

// The one rule props and their `data-*` attributes share: a prop becomes a
// kebab-case attribute, except at its default, which has none.

const propSchema = {
  textAlignment: { default: "left", values: ["left", "center"] },
  previewWidth: { default: undefined, type: "number" },
  checked: { default: false },
} as const;

describe("propsToDataAttributes", () => {
  it("leaves out props at their default or absent, and stringifies the rest", () => {
    expect(
      propsToDataAttributes(
        { textAlignment: "center", checked: true },
        propSchema,
      ),
    ).toEqual({ "data-text-alignment": "center", "data-checked": "true" });
    expect(
      propsToDataAttributes(
        { textAlignment: "left", previewWidth: 256, checked: false },
        propSchema,
      ),
    ).toEqual({ "data-preview-width": "256" });
    expect(propsToDataAttributes({}, propSchema)).toEqual({});
  });

  it("keeps the props' own order, and has no attribute for an unknown prop", () => {
    expect(
      Object.keys(
        propsToDataAttributes(
          { checked: true, unknown: "x", textAlignment: "center" } as any,
          propSchema,
        ),
      ),
    ).toEqual(["data-checked", "data-text-alignment"]);
  });
});

describe("setDataAttributes", () => {
  it("sets the attributes and removes nothing", () => {
    const element = document.createElement("div");
    element.setAttribute("data-checked", "author");
    setDataAttributes(
      element,
      propsToDataAttributes({ textAlignment: "center" }, propSchema),
    );
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
    applyDataAttributes(element, { previewWidth: 100 }, propSchema);
    expect(element.getAttribute("data-preview-width")).toBe("100");
    expect(element.hasAttribute("data-text-alignment")).toBe(false);
    expect(element.hasAttribute("data-checked")).toBe(false);
    expect(element.getAttribute("data-other")).toBe("kept");
  });
});
