import { BlockNoteEditor, createExtension } from "@blocknote/core";
import { afterEach, expect, test, vi } from "vite-plus/test";

import { getDiagramMathRenderer } from "./getDiagramMathRenderer.js";
import { renderDiagram } from "./renderDiagram.js";
import type { MathRenderer } from "./MathRenderer.js";

const editors: BlockNoteEditor[] = [];
afterEach(() => {
  for (const editor of editors.splice(0)) {
    editor._tiptapEditor.destroy();
  }
});

function editorWith(renderer?: MathRenderer) {
  const editor = BlockNoteEditor.create({
    extensions: renderer ? [createExtension(renderer)] : [],
  });
  editors.push(editor);
  return editor;
}

test("without a math extension, diagram labels retain TeX", async () => {
  const math = getDiagramMathRenderer(editorWith());
  expect(math).toBeUndefined();
  const result = await renderDiagram('graph LR\n A["$$x^2$$"]', { math });
  if (result.error !== undefined) {
    throw new Error(result.error);
  }
  expect(result.svg).toContain("x^2");
});

test("headless rendering keeps TeX instead of returning browser-only markup", async () => {
  const render = vi.fn<MathRenderer["render"]>(() => ({
    htmlString: '<span class="katex">formula</span>',
    error: undefined,
  }));
  const math = getDiagramMathRenderer(
    editorWith({ key: "math-render", render }),
  );
  const result = await renderDiagram('graph LR\n A["$$x^2$$"]', { math });
  if (result.error !== undefined) {
    throw new Error(result.error);
  }
  expect(render).toHaveBeenCalledWith("x^2", false);
  expect(result.svg).toContain("x^2");
  expect(result.svg).not.toContain("<foreignObject");
  expect(getDiagramMathRenderer(editorWith())).toBeUndefined();
});

test("invalid math falls back to TeX, but unexpected failures propagate", () => {
  const render = vi.fn<MathRenderer["render"]>(() => ({
    htmlString: "invalid",
    error: "Invalid formula",
  }));
  const math = getDiagramMathRenderer(
    editorWith({ key: "math-render", render }),
  );
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
