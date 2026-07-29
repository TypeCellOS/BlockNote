import App from "@examples/05-interoperability/04-converting-blocks-from-md/src/App";
import { preprocessMarkdown } from "@examples/05-interoperability/04-converting-blocks-from-md/src/markdown/preprocessMarkdown";
import { postprocessBlocks } from "@examples/05-interoperability/04-converting-blocks-from-md/src/markdown/postprocessBlocks";
import { renderLatex } from "@examples/05-interoperability/04-converting-blocks-from-md/src/formula/katexRenderer";

import { beforeEach, describe, expect, test } from "vite-plus/test";
import { render } from "vitest-browser-react";
import { userEvent } from "../../utils/context.js";
import { EDITOR_SELECTOR } from "../../utils/const.js";
import {
  sleep,
  waitForSelector,
  waitForSelectorDetached,
} from "../../utils/editor.js";

// The formula editor UI is example-local (not part of the core toolbar
// component set), so there are no shared consts for it in `utils/const.ts`.
// `data-test="formula"` is added to `FormulaButton.tsx` for this test: it
// mirrors the convention the built-in formatting toolbar buttons already use
// (`data-test="colors"`, `data-test="createLink"`, ...), and is forwarded
// through Mantine's `ToolbarButton` (`...rest` spread) onto the native
// `<button>`.
const FORMULA_BUTTON_SELECTOR = `[data-test="formula"]`;
const FORMULA_MODAL_SELECTOR = `.formula-modal`;
const FORMULA_CONFIRM_SELECTOR = `[data-testid="formula-confirm"]`;

describe("preprocessMarkdown", () => {
  test("no formulas: passes through", () => {
    const { processed, inlineMap, blockMap } =
      preprocessMarkdown("hello world");
    expect(processed).toBe("hello world");
    expect(inlineMap.size).toBe(0);
    expect(blockMap.size).toBe(0);
  });

  test("single inline formula", () => {
    const { processed, inlineMap } = preprocessMarkdown("x = $a + b$ end");
    expect(inlineMap.size).toBe(1);
    const [token, latex] = [...inlineMap.entries()][0];
    expect(latex).toBe("a + b");
    expect(processed).toContain(token);
    expect(processed).not.toContain("$");
  });

  test("single block formula", () => {
    const { processed, blockMap } = preprocessMarkdown(
      "prelude\n$$E = mc^2$$\npost",
    );
    expect(blockMap.size).toBe(1);
    const [, latex] = [...blockMap.entries()][0];
    expect(latex).toBe("E = mc^2");
    expect(processed).toContain("prelude");
    expect(processed).toContain("post");
    expect(processed).not.toContain("$$");
  });

  test("both inline and block", () => {
    const { inlineMap, blockMap } = preprocessMarkdown(
      "part $x$ then\n$$y = 1$$",
    );
    expect(inlineMap.size).toBe(1);
    expect(blockMap.size).toBe(1);
  });

  test("stray dollar without closing is left alone", () => {
    const { processed, inlineMap } = preprocessMarkdown("cost is $5 dollars");
    expect(inlineMap.size).toBe(0);
    expect(processed).toBe("cost is $5 dollars");
  });

  test("multi-line block formula", () => {
    const { blockMap } = preprocessMarkdown(
      "before\n$$\na = 1 \\\\\nb = 2\n$$\nafter",
    );
    expect(blockMap.size).toBe(1);
    const [, latex] = [...blockMap.entries()][0];
    expect(latex).toContain("a = 1");
    expect(latex).toContain("b = 2");
  });
});

describe("postprocessBlocks", () => {
  test("wraps whole-token paragraph into formulaBlock", () => {
    const inlineMap = new Map<string, string>();
    const blockMap = new Map<string, string>([["⟪FML_BLOCK_0⟫", "E = mc^2"]]);
    const blocks = [
      {
        type: "paragraph",
        content: [{ type: "text", text: "⟪FML_BLOCK_0⟫", styles: {} }],
      },
    ];
    const out = postprocessBlocks(blocks as any, inlineMap, blockMap);
    expect(out[0].type).toBe("formulaBlock");
    expect((out[0] as any).props.latex).toBe("E = mc^2");
  });

  test("splits inline token inside a paragraph", () => {
    const inlineMap = new Map<string, string>([["⟪FML_INLINE_0⟫", "a+b"]]);
    const blockMap = new Map<string, string>();
    const blocks = [
      {
        type: "paragraph",
        content: [
          { type: "text", text: "start ⟪FML_INLINE_0⟫ end", styles: {} },
        ],
      },
    ];
    const out = postprocessBlocks(blocks as any, inlineMap, blockMap);
    const content = (out[0] as any).content as any[];
    expect(content).toHaveLength(3);
    expect(content[0].text).toBe("start ");
    expect(content[1].type).toBe("formulaInline");
    expect(content[1].props.latex).toBe("a+b");
    expect(content[2].text).toBe(" end");
  });

  test("leaves non-token paragraphs unchanged", () => {
    const blocks = [
      {
        type: "paragraph",
        content: [{ type: "text", text: "hello", styles: {} }],
      },
    ];
    const out = postprocessBlocks(blocks as any, new Map(), new Map());
    expect((out[0] as any).content[0].text).toBe("hello");
  });
});

describe("renderLatex", () => {
  test("renders math", () => {
    const r = renderLatex("\\frac{1}{2}");
    expect(r.error).toBeNull();
    expect(r.html).toContain("katex");
  });

  test("renders chemistry via mhchem", () => {
    const r = renderLatex("\\ce{H2SO4}");
    expect(r.error).toBeNull();
    expect(r.html).toContain("katex");
  });

  test("reports error on malformed input", () => {
    const r = renderLatex("\\frac{1}");
    expect(r.error).not.toBeNull();
    expect(r.html).toContain("formula-error");
  });
});

describe("Formula editor UI", () => {
  beforeEach(async () => {
    await render(<App />);
    await waitForSelector(EDITOR_SELECTOR);
    // The initial markdown template is loaded asynchronously in a `useEffect`
    // (preprocess -> tryParseMarkdownToBlocks -> postprocess -> replaceBlocks)
    // -- wait for it to settle before a test inspects the document.
    await sleep(300);
  });

  test("renders initial formulas from markdown template", async () => {
    // KaTeX outputs a span with class 'katex' -- verify at least one exists,
    // and that both formula node types from the template are present.
    const katexNodes = document.querySelectorAll(`${EDITOR_SELECTOR} .katex`);
    expect(katexNodes.length).toBeGreaterThan(0);

    const inlineFormulas = document.querySelectorAll(
      `${EDITOR_SELECTOR} .formula-inline`,
    );
    expect(inlineFormulas.length).toBeGreaterThan(0);

    const blockFormulas = document.querySelectorAll(
      `${EDITOR_SELECTOR} .formula-block`,
    );
    expect(blockFormulas.length).toBeGreaterThan(0);
  });

  test("inserts an inline formula via the toolbar button", async () => {
    // Type into the trailing block (BlockNote always keeps an empty block at
    // the end of the document to type into) so this doesn't depend on where
    // the pre-populated template content happens to end.
    const trailing = await waitForSelector(
      `${EDITOR_SELECTOR} .bn-trailing-block`,
    );
    await userEvent.click(trailing);
    await userEvent.keyboard("hello world");
    // Select all text in the block so the formatting toolbar appears.
    await userEvent.keyboard("{Home}{Shift>}{End}{/Shift}");

    const before = document.querySelectorAll(
      `${EDITOR_SELECTOR} .katex`,
    ).length;

    // Click the formula button on the toolbar.
    const button = await waitForSelector(FORMULA_BUTTON_SELECTOR);
    await userEvent.click(button);

    // Modal appears in Insert mode -- starts with an empty textarea.
    const modal = await waitForSelector(FORMULA_MODAL_SELECTOR);
    const textarea = modal.querySelector("textarea") as HTMLTextAreaElement;
    expect(textarea).toBeTruthy();
    expect(textarea.value).toBe("");

    // Type LaTeX.
    await userEvent.click(textarea);
    await userEvent.type(textarea, "\\frac{1}{2}");

    // Preview shows a katex node once the debounced render fires.
    await sleep(300);
    const previewKatex = modal.querySelector(".formula-modal-preview .katex");
    expect(previewKatex).toBeTruthy();

    // Confirm.
    const confirm = modal.querySelector(
      FORMULA_CONFIRM_SELECTOR,
    ) as HTMLButtonElement;
    expect(confirm.disabled).toBe(false);
    await userEvent.click(confirm);

    // Modal closes and a new katex node appears in the editor.
    await waitForSelectorDetached(FORMULA_MODAL_SELECTOR);
    const after = document.querySelectorAll(`${EDITOR_SELECTOR} .katex`).length;
    expect(after).toBeGreaterThan(before);
  });

  test("edits an existing formula by clicking it", async () => {
    // The initial markdown template's first `$$...$$` block becomes the
    // quadratic formula block -- see `initialMarkdown.ts`.
    const blockFormulas = document.querySelectorAll<HTMLElement>(
      `${EDITOR_SELECTOR} .formula-block`,
    );
    expect(blockFormulas.length).toBeGreaterThan(0);

    await userEvent.click(blockFormulas[0]);

    // Modal appears in Edit mode -- pre-filled with the formula's existing
    // LaTeX, proving the click opened Edit (not Insert) mode.
    const modal = await waitForSelector(FORMULA_MODAL_SELECTOR);
    const textarea = modal.querySelector("textarea") as HTMLTextAreaElement;
    expect(textarea).toBeTruthy();
    expect(textarea.value).toContain("\\frac{-b");

    // The "kind" (inline vs block) is locked while editing.
    const blockRadio = modal.querySelector(
      'input[name="formula-kind"][value="block"]',
    ) as HTMLInputElement;
    expect(blockRadio.checked).toBe(true);
    expect(blockRadio.disabled).toBe(true);

    // Replace the LaTeX with something new and distinct.
    const newLatex = "E = mc^2";
    await userEvent.click(textarea);
    await userEvent.clear(textarea);
    await userEvent.type(textarea, newLatex);

    await sleep(300);
    const confirm = modal.querySelector(
      FORMULA_CONFIRM_SELECTOR,
    ) as HTMLButtonElement;
    expect(confirm.disabled).toBe(false);
    await userEvent.click(confirm);

    await waitForSelectorDetached(FORMULA_MODAL_SELECTOR);

    // Re-open the same (still first) block formula and confirm the edit
    // persisted to the document, rather than only to the modal's local state.
    const updated = document.querySelectorAll<HTMLElement>(
      `${EDITOR_SELECTOR} .formula-block`,
    );
    expect(updated.length).toBe(blockFormulas.length);
    await userEvent.click(updated[0]);

    const reopened = await waitForSelector(FORMULA_MODAL_SELECTOR);
    const reopenedTextarea = reopened.querySelector(
      "textarea",
    ) as HTMLTextAreaElement;
    expect(reopenedTextarea.value).toBe(newLatex);
  });
});
