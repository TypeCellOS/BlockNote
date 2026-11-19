// @vitest-environment node
import { expect, test, vi } from "vite-plus/test";

import { createHTMLExportOutput } from "./HTMLExportSession.js";

test("element roots are allocated lazily and cached, including empty results", () => {
  const nodes: Node[] = [];
  const filter = vi.spyOn(nodes, "filter");
  const output = createHTMLExportOutput(nodes);

  expect(output.nodes).toBe(nodes);
  expect(filter).not.toHaveBeenCalled();

  const elements = output.elements;
  expect(elements).toEqual([]);
  expect(filter).toHaveBeenCalledTimes(1);
  expect(output.elements).toBe(elements);
  expect(filter).toHaveBeenCalledTimes(1);
});
