import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { expect, test } from "vite-plus/test";

import { usePrefersColorScheme } from "./usePrefersColorScheme.js";

function Readout() {
  return createElement("span", null, usePrefersColorScheme());
}

test("server rendering needs no browser APIs and has a stable hydration snapshot", () => {
  expect(renderToString(createElement(Readout))).toBe(
    "<span>no-preference</span>",
  );
});
