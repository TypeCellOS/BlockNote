import { createExtension } from "@blocknote/core";
import { expect, test, vi } from "vite-plus/test";

import { getDiagramMathRenderer } from "./getDiagramMathRenderer.js";
import { renderDiagram } from "./renderDiagram.js";
import type { MathRenderer } from "./DiagramMathRenderer.js";

it("without a math extension, diagram labels retain TeX", async ({
  setupEditor,
}) => {
  const { editor } = await setupEditor();
  const math = getDiagramMathRenderer(editor);
  expect(math).toBeUndefined();
  const result = await renderDiagram('graph LR\n A["$$x^2$$"]', { math });
  if (result.error !== undefined) {
    throw new Error(result.error);
  }
  expect(result.svg).toContain("x^2");
});

it("headless rendering keeps TeX instead of returning browser-only markup", async ({
  setupEditor,
}) => {
  const render = vi.fn<MathRenderer["render"]>(() => ({
    htmlString: '<span class="katex">formula</span>',
    error: undefined,
  }));
  const { editor } = await setupEditor({
    extensions: [createExtension({ key: "math-render", render })],
  });
  const math = getDiagramMathRenderer(editor);
  const result = await renderDiagram('graph LR\n A["$$x^2$$"]', { math });
  if (result.error !== undefined) {
    throw new Error(result.error);
  }
  expect(render).toHaveBeenCalledWith("x^2", false);
  expect(result.svg).toContain("x^2");
  expect(result.svg).not.toContain("<foreignObject");
  const { editor: editorWithoutMath } = await setupEditor();
  expect(getDiagramMathRenderer(editorWithoutMath)).toBeUndefined();
});

it("invalid math falls back to TeX, but unexpected failures propagate", async ({
  setupEditor,
}) => {
  const render = vi.fn<MathRenderer["render"]>(() => ({
    htmlString: "invalid",
    error: "Invalid formula",
  }));
  const { editor } = await setupEditor({
    extensions: [createExtension({ key: "math-render", render })],
  });
  const math = getDiagramMathRenderer(editor);
  expect(math?.("\\frac{", { fontSize: 18 })).toBeNull();
  const failure = new Error("Infrastructure failure");
  render.mockImplementation(() => {
    throw failure;
  });
  expect(() => math?.("x", { fontSize: 18 })).toThrow(failure);
});

test("the public math callback uses a backend-independent markup contract", async () => {
  const math = vi.fn(() => ({
    format: "svg" as const,
    content:
      '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="16"><path data-custom-math="true" d="M0 0L24 16" /></svg>',
    width: 24,
    height: 16,
  }));
  const result = await renderDiagram('graph LR\n A["$$x^2$$"]', { math });
  if (result.error !== undefined) {
    throw new Error(result.error);
  }
  expect(math).toHaveBeenCalledWith("x^2", { fontSize: expect.any(Number) });
  expect(result.svg).toContain('data-custom-math="true"');
});
