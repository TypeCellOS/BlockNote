import { describe, expect, it } from "vitest";
import { createNumberedListItemBlockSpec } from "../../../../../packages/core/src/blocks/ListItem/NumberedListItem/block.js";

describe("NumberedListItem parse() method", () => {
  const blockSpec = createNumberedListItemBlockSpec();
  const parseFunc = blockSpec.implementation.parse;

  if (!parseFunc) {
    throw new Error("parse function not found");
  }

  it("should always return an object with 'start' property - first item, startIndex=1", () => {
    // Create mock DOM elements
    const li = document.createElement("li");
    const ol = document.createElement("ol");
    ol.setAttribute("start", "1");
    ol.appendChild(li);

    const result = parseFunc(li);

    // The parse function should return an object with 'start' property
    expect(result).toBeDefined();
    expect(result).toHaveProperty("start");
    expect(result?.start).toBeUndefined(); // Should be undefined for first item at index 1
  });

  it("should always return an object with 'start' property - first item, startIndex=5", () => {
    const li = document.createElement("li");
    const ol = document.createElement("ol");
    ol.setAttribute("start", "5");
    ol.appendChild(li);

    const result = parseFunc(li);

    expect(result).toBeDefined();
    expect(result).toHaveProperty("start");
    expect(result?.start).toBe(5); // Should be 5 for first item at non-standard index
  });

  it("should always return an object with 'start' property - subsequent item", () => {
    const li1 = document.createElement("li");
    const li2 = document.createElement("li");
    const ol = document.createElement("ol");
    ol.setAttribute("start", "1");
    ol.appendChild(li1);
    ol.appendChild(li2);

    const result = parseFunc(li2);

    expect(result).toBeDefined();
    expect(result).toHaveProperty("start");
    expect(result?.start).toBeUndefined(); // Subsequent items don't need explicit start
  });

  it("should always return an object with 'start' property - subsequent item in list starting at 5", () => {
    const li1 = document.createElement("li");
    const li2 = document.createElement("li");
    const ol = document.createElement("ol");
    ol.setAttribute("start", "5");
    ol.appendChild(li1);
    ol.appendChild(li2);

    const result = parseFunc(li2);

    expect(result).toBeDefined();
    expect(result).toHaveProperty("start");
    expect(result?.start).toBeUndefined(); // Subsequent items get undefined
  });

  it("regression test for issue #2241 - ensures 'start' property is always present", () => {
    // This test verifies the fix for issue #2241
    // The old code would return defaultProps (without 'start') for certain conditions
    // The new code always includes 'start' in the returned object

    const testCases = [
      { startAttr: "1", hasPreSibling: false, expectedStart: undefined },
      { startAttr: "1", hasPreSibling: true, expectedStart: undefined },
      { startAttr: "5", hasPreSibling: false, expectedStart: 5 },
      { startAttr: "5", hasPreSibling: true, expectedStart: undefined },
    ];

    testCases.forEach(({ startAttr, hasPreSibling, expectedStart }) => {
      const li = document.createElement("li");
      const ol = document.createElement("ol");
      ol.setAttribute("start", startAttr);

      if (hasPreSibling) {
        const li1 = document.createElement("li");
        ol.appendChild(li1);
      }

      ol.appendChild(li);

      const result = parseFunc(li);

      // Critical assertion: 'start' property must ALWAYS be present
      expect(result).toHaveProperty("start");
      expect(result?.start).toBe(expectedStart);
    });
  });
});
