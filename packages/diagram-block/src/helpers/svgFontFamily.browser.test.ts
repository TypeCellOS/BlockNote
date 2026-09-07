import { describe, expect, test } from "vite-plus/test";

import { withSVGFontFamily } from "./svgFontFamily.js";

// Browser unit tests (DOMParser/XMLSerializer) for the SVG font rewrite the
// preview and the export renderers share. Runs in the tests package's
// browser suite.
describe("withSVGFontFamily", () => {
  test("rewrites style-block declarations and font-family attributes", () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><style>#d .label{font-family:"trebuchet ms",verdana,arial,sans-serif;font-size:16px;}#d .edgeLabel{font-family:"trebuchet ms",verdana;}</style><text font-family="trebuchet ms">Hi</text></svg>`;

    const out = withSVGFontFamily(svg, '"Inter", sans-serif');

    expect(out).not.toContain("trebuchet");
    expect(out).not.toContain("verdana");
    // Both declarations and the attribute point at the new family; unrelated
    // declarations are untouched. (The serializer escapes quotes inside the
    // attribute value.)
    expect(out.match(/font-family:"Inter", sans-serif/g)).toHaveLength(2);
    expect(out).toContain(`font-family="&quot;Inter&quot;, sans-serif"`);
    expect(out).toContain("font-size:16px");
    expect(out).toContain(">Hi</text>");
  });

  test("leaves an SVG without font declarations unchanged", () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10"/></svg>`;

    expect(withSVGFontFamily(svg, "Inter")).toContain("<rect");
  });
});
