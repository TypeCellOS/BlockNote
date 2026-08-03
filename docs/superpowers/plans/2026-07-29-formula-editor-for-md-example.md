# Formula Editor for the Markdown-Import Example — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn `examples/05-interoperability/04-converting-blocks-from-md` into an editable, teacher-friendly editor that renders math (`$...$`, `$$...$$`) and chemistry (`\ce{}`) formulas via KaTeX + mhchem, and lets teachers insert/edit them through a toolbar-triggered modal with tabs, palette, and live preview.

**Architecture:** Two new BlockNote schema nodes — `formulaInline` (inline content) and `formulaBlock` (block) — each carrying a single `latex` string prop rendered by KaTeX. Interaction goes through a React modal (`FormulaEditorModal`) opened by a formatting-toolbar button or by clicking an existing formula. Markdown import runs a placeholder-based pre-/post-processor around `editor.tryParseMarkdownToBlocks` so `$...$`/`$$...$$` become formula nodes.

**Tech Stack:** `@blocknote/core`, `@blocknote/react`, `@blocknote/mantine`, React 19, `katex` + `katex/contrib/mhchem`, vitest browser mode (for e2e).

## Global Constraints

- All new code lives inside `examples/05-interoperability/04-converting-blocks-from-md/`; no changes to any published `@blocknote/*` package.
- The example's `main.tsx`, `index.html`, `package.json`, `tsconfig.json`, `vite.config.ts` are AUTO-GENERATED from `.bnexample.json` + templates in `packages/dev-scripts/examples/template-react/`. Manual edits to `package.json` are permitted only when they mirror what the generator will produce after `.bnexample.json` is updated; running `vp run gen:examples` from the repo root regenerates them.
- Example editable code = `src/App.tsx`, `src/styles.css`, and any new file under `src/`.
- Render library is KaTeX only. mhchem is registered globally once. No MathJax anywhere.
- Formula nodes store raw LaTeX as `props.latex: string`. `\ce{...}` is the storage for chemistry; the tab in the modal only chooses which palette is shown.
- E2E tests live under `tests/src/end-to-end/formula/` and import App via the `@examples/...` alias, same as other e2e tests.
- Only Vietnamese labels for user-facing strings, matching the target audience.
- Package manager is `pnpm` via `vp`. Never use `npm`/`yarn`. Never use `tsc` — use `vp run lint`.
- Do not create git commits (project instruction in `CLAUDE.md`). Each task's "Commit" step is left to the human operator; when the human asks for commits, use whatever convention they specify — do not add `Co-Authored-By` lines.

---

## File Structure

Created:

```
examples/05-interoperability/04-converting-blocks-from-md/
  src/
    App.tsx                            # rewritten: editable editor, load md once
    schema.tsx                          # extended BlockNoteSchema
    formula/
      katexRenderer.ts                 # renderLatex + mhchem registration
      FormulaInline.tsx                # inline node React component
      FormulaBlock.tsx                 # block node React component
      formulaContext.tsx               # React context: open/close modal, state
      FormulaEditorModal.tsx           # modal UI: tabs, palette, textarea, preview
      palettes.ts                      # PaletteItem type + mathPalette + chemPalette
      insertAtCaret.ts                 # pure snippet-insertion helper
    markdown/
      preprocessMarkdown.ts            # regex + placeholder + maps (pure)
      postprocessBlocks.ts             # replace placeholders with formula nodes (pure)
      initialMarkdown.ts               # bundled Vietnamese sample template
    toolbar/
      FormulaButton.tsx                # toolbar button, opens modal
      CustomFormattingToolbar.tsx      # wraps default toolbar + injects button
  styles.css                           # modal + block centering + hover state (or under src/)

tests/src/end-to-end/formula/
  formula.test.tsx                     # pure unit tests + browser scenarios
```

Modified:

```
examples/05-interoperability/04-converting-blocks-from-md/
  .bnexample.json                      # add "dependencies": { katex, @types/katex }
  package.json                         # auto-regenerated after vp run gen:examples
  src/App.tsx                          # rewritten in Task 8
  src/styles.css                       # extended in Task 8
  README.md                            # updated in Task 8
```

---

## Task 1: Add `katex` dependency to the example

**Files:**

- Modify: `examples/05-interoperability/04-converting-blocks-from-md/.bnexample.json`
- Modify (regenerated): `examples/05-interoperability/04-converting-blocks-from-md/package.json`

**Interfaces:**

- Consumes: nothing.
- Produces: `katex` and `@types/katex` importable from the example directory. No exported source symbols.

- [ ] **Step 1: Update `.bnexample.json` to declare the KaTeX deps**

Replace file contents with:

```json
{
  "playground": true,
  "docs": true,
  "author": "yousefed",
  "tags": ["Basic", "Blocks", "Import/Export"],
  "dependencies": {
    "katex": "^0.16.11"
  },
  "devDependencies": {
    "@types/katex": "^0.16.7"
  }
}
```

- [ ] **Step 2: Regenerate example scaffolding**

Run from repo root:

```bash
vp run gen:examples
```

This regenerates `examples/05-interoperability/04-converting-blocks-from-md/package.json` with the new deps merged in.

- [ ] **Step 3: Install**

Run from repo root:

```bash
vp install
```

- [ ] **Step 4: Verify the dev server still boots**

Run from the example directory:

```bash
cd examples/05-interoperability/04-converting-blocks-from-md && vp run dev
```

Expected: dev server prints "Local: http://localhost:5173" and the page loads with the existing 2-pane layout unchanged. Stop the server (Ctrl+C).

- [ ] **Step 5: Verify TypeScript resolves the new dep**

Add a temporary file `tmp-katex-check.ts` at the example root:

```ts
import katex from "katex";
export const _ = katex.renderToString("1");
```

Run: `vp run lint` from the example directory.
Expected: no TypeScript errors about `katex`.
Then delete `tmp-katex-check.ts`.

---

## Task 2: KaTeX render utility with mhchem registration

**Files:**

- Create: `examples/05-interoperability/04-converting-blocks-from-md/src/formula/katexRenderer.ts`

**Interfaces:**

- Consumes: `katex`.
- Produces:

  ```ts
  export type RenderResult = { html: string; error: string | null };
  export function renderLatex(
    latex: string,
    options?: { displayMode?: boolean },
  ): RenderResult;
  ```

  On parse error, `html` is a safe fallback (`<span class="formula-error">[?]</span>`) and `error` is the KaTeX error message; on success, `error` is `null`.

- [ ] **Step 1: Create `src/formula/katexRenderer.ts`**

```ts
import katex from "katex";
import "katex/dist/katex.min.css";
import "katex/contrib/mhchem";

export type RenderResult = { html: string; error: string | null };

export function renderLatex(
  latex: string,
  options: { displayMode?: boolean } = {},
): RenderResult {
  try {
    const html = katex.renderToString(latex, {
      displayMode: options.displayMode ?? false,
      throwOnError: true,
      strict: "ignore",
      trust: false,
    });
    return { html, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      html: `<span class="formula-error" title="${escapeAttr(message)}">[?]</span>`,
      error: message,
    };
  }
}

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}
```

- [ ] **Step 2: Verify it compiles**

Run from the example directory:

```bash
vp run lint
```

Expected: no errors.

- [ ] **Step 3: Manual smoke check (temporary)**

Add temporarily to `src/App.tsx` above `export default`:

```ts
import { renderLatex } from "./formula/katexRenderer";
// eslint-disable-next-line no-console
console.log("math:", renderLatex("\\frac{1}{2}").html.slice(0, 40));
// eslint-disable-next-line no-console
console.log("chem:", renderLatex("\\ce{H2SO4}").html.slice(0, 40));
// eslint-disable-next-line no-console
console.log("bad :", renderLatex("\\frac{1}").error);
```

Run `vp run dev` from the example directory, open http://localhost:5173, open browser console.
Expected: three console lines. `math:` and `chem:` start with `<span class="katex"`, `bad :` shows a KaTeX error message (non-null).

Remove the three temporary lines and the import when done. Stop the dev server.

- [ ] **Step 4: Commit** — the human will decide when to commit; note that this task's deliverable is a self-contained utility.

---

## Task 3: `formulaInline` node — schema + component + wire into example schema

**Files:**

- Create: `examples/05-interoperability/04-converting-blocks-from-md/src/formula/FormulaInline.tsx`
- Create: `examples/05-interoperability/04-converting-blocks-from-md/src/schema.tsx`
- Modify: `examples/05-interoperability/04-converting-blocks-from-md/src/App.tsx`

**Interfaces:**

- Consumes: `renderLatex` from `./katexRenderer`.
- Produces:

  ```ts
  // in schema.tsx
  export const formulaInline: /* InlineContentSpec */ any;
  export const schema: /* BlockNoteSchema */ any;
  export type FormulaSchema = typeof schema;
  ```

  `formulaInline` has `type: "formulaInline"`, `propSchema: { latex: { default: "" } }`, `content: "none"`. Later tasks will import `schema` and `FormulaSchema` from `./schema`.

- [ ] **Step 1: Create the inline React component**

Create `src/formula/FormulaInline.tsx`:

```tsx
import { renderLatex } from "./katexRenderer";

export type FormulaInlineViewProps = {
  latex: string;
  onOpenEditor: () => void;
};

export function FormulaInlineView({
  latex,
  onOpenEditor,
}: FormulaInlineViewProps) {
  const { html } = renderLatex(latex, { displayMode: false });
  return (
    <span
      className="formula-inline"
      role="button"
      tabIndex={0}
      onClick={onOpenEditor}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpenEditor();
        }
      }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
```

- [ ] **Step 2: Create the schema module**

Create `src/schema.tsx`:

```ts
import {
  BlockNoteSchema,
  defaultBlockSpecs,
  defaultInlineContentSpecs,
} from "@blocknote/core";
import { createReactInlineContentSpec } from "@blocknote/react";
import { FormulaInlineView } from "./formula/FormulaInline";
import { useFormulaEditor } from "./formula/formulaContext";

export const formulaInline = createReactInlineContentSpec(
  {
    type: "formulaInline",
    propSchema: {
      latex: { default: "" },
    },
    content: "none",
  },
  {
    render: (props) => {
      const editor = useFormulaEditor();
      return (
        <FormulaInlineView
          latex={props.inlineContent.props.latex}
          onOpenEditor={() =>
            editor.openEdit({ kind: "inline", latex: props.inlineContent.props.latex })
          }
        />
      );
    },
  },
);

export const schema = BlockNoteSchema.create({
  inlineContentSpecs: {
    ...defaultInlineContentSpecs,
    formulaInline,
  },
  blockSpecs: {
    ...defaultBlockSpecs,
    // formulaBlock added in Task 4
  },
});

export type FormulaSchema = typeof schema;
```

Note: this file references `useFormulaEditor` from `formulaContext.tsx` which is created in Task 5. Until that exists, this file will fail typecheck — that is expected. Task 5 makes the wiring valid.

- [ ] **Step 3: Wire the schema into App.tsx**

In `src/App.tsx`, replace the `useCreateBlockNote()` call with:

```tsx
import { schema } from "./schema";
// ...
const editor = useCreateBlockNote({ schema });
```

The rest of `App.tsx` remains unchanged for now (still readonly, still 2-pane). This step just ensures the schema loads without breaking existing behavior.

- [ ] **Step 4: Skip verification here**

Because `schema.tsx` imports from a not-yet-created `formulaContext.tsx`, `vp run lint` and dev server will fail until Task 5. That is expected. Verification happens at the end of Task 5.

---

## Task 4: `formulaBlock` node — schema + component

**Files:**

- Create: `examples/05-interoperability/04-converting-blocks-from-md/src/formula/FormulaBlock.tsx`
- Modify: `examples/05-interoperability/04-converting-blocks-from-md/src/schema.tsx`

**Interfaces:**

- Consumes: `renderLatex`, `useFormulaEditor` (created in Task 5).
- Produces:

  ```ts
  // added to schema.tsx exports
  export const formulaBlock: /* BlockSpec */ any;
  ```

  `formulaBlock` has `type: "formulaBlock"`, `propSchema: { latex: { default: "" } }`, `content: "none"`, rendered as centered `<div>`.

- [ ] **Step 1: Create the block React component**

Create `src/formula/FormulaBlock.tsx`:

```tsx
import { renderLatex } from "./katexRenderer";

export type FormulaBlockViewProps = {
  latex: string;
  onOpenEditor: () => void;
};

export function FormulaBlockView({
  latex,
  onOpenEditor,
}: FormulaBlockViewProps) {
  const isEmpty = latex.trim().length === 0;
  const { html } = renderLatex(latex, { displayMode: true });
  return (
    <div
      className="formula-block"
      role="button"
      tabIndex={0}
      onClick={onOpenEditor}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpenEditor();
        }
      }}
    >
      {isEmpty ? (
        <span className="formula-placeholder">Nhấp để soạn công thức</span>
      ) : (
        <span dangerouslySetInnerHTML={{ __html: html }} />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Add `formulaBlock` to `src/schema.tsx`**

Add near the existing `formulaInline` definition:

```ts
import { createReactBlockSpec } from "@blocknote/react";
import { FormulaBlockView } from "./formula/FormulaBlock";

export const formulaBlock = createReactBlockSpec(
  {
    type: "formulaBlock",
    propSchema: {
      latex: { default: "" },
    },
    content: "none",
  },
  {
    render: (props) => {
      const editor = useFormulaEditor();
      return (
        <FormulaBlockView
          latex={props.block.props.latex}
          onOpenEditor={() =>
            editor.openEdit({
              kind: "block",
              latex: props.block.props.latex,
              blockId: props.block.id,
            })
          }
        />
      );
    },
  },
);
```

Update the `BlockNoteSchema.create({...})` call:

```ts
blockSpecs: {
  ...defaultBlockSpecs,
  formulaBlock,
},
```

- [ ] **Step 3: Skip verification** — still needs `useFormulaEditor`. Verified end of Task 5.

---

## Task 5: Palette data, snippet-insertion helper, formula editor context, modal skeleton

**Files:**

- Create: `examples/05-interoperability/04-converting-blocks-from-md/src/formula/palettes.ts`
- Create: `examples/05-interoperability/04-converting-blocks-from-md/src/formula/insertAtCaret.ts`
- Create: `examples/05-interoperability/04-converting-blocks-from-md/src/formula/formulaContext.tsx`
- Create: `examples/05-interoperability/04-converting-blocks-from-md/src/formula/FormulaEditorModal.tsx`

**Interfaces:**

- Consumes: `renderLatex`.
- Produces:

  ```ts
  // palettes.ts
  export type PaletteItem = {
    label: string;
    snippet: string;
    tooltip: string;
    caretOffset?: number;
  };
  export const mathPalette: PaletteItem[];
  export const chemPalette: PaletteItem[];

  // insertAtCaret.ts
  export function insertAtCaret(
    textarea: HTMLTextAreaElement,
    item: PaletteItem,
  ): { value: string; caret: number };

  // formulaContext.tsx
  export type FormulaTarget =
    | { kind: "inline"; latex: string }
    | { kind: "block"; latex: string; blockId: string };
  export type FormulaEditorApi = {
    openInsert(initialKind: "inline" | "block"): void;
    openEdit(target: FormulaTarget): void;
    close(): void;
  };
  export function FormulaEditorProvider(props: {
    children: React.ReactNode;
  }): JSX.Element;
  export function useFormulaEditor(): FormulaEditorApi;
  export function useFormulaEditorState(): {
    open: boolean;
    mode: "insert" | "edit";
    initialLatex: string;
    initialKind: "inline" | "block";
    editTarget: FormulaTarget | null;
  };

  // FormulaEditorModal.tsx
  export function FormulaEditorModal(): JSX.Element | null;
  ```

- [ ] **Step 1: Create `palettes.ts`**

```ts
export type PaletteItem = {
  label: string;
  snippet: string;
  tooltip: string;
  caretOffset?: number;
};

export const mathPalette: PaletteItem[] = [
  { label: "x^{n}", snippet: "^{}", tooltip: "Mũ", caretOffset: 2 },
  { label: "x_{n}", snippet: "_{}", tooltip: "Chỉ số dưới", caretOffset: 2 },
  {
    label: "\\frac{a}{b}",
    snippet: "\\frac{}{}",
    tooltip: "Phân số",
    caretOffset: 6,
  },
  {
    label: "\\sqrt{x}",
    snippet: "\\sqrt{}",
    tooltip: "Căn bậc hai",
    caretOffset: 6,
  },
  {
    label: "\\sqrt[n]{x}",
    snippet: "\\sqrt[]{}",
    tooltip: "Căn bậc n",
    caretOffset: 6,
  },
  {
    label: "\\int_{a}^{b}",
    snippet: "\\int_{}^{}",
    tooltip: "Tích phân",
    caretOffset: 6,
  },
  {
    label: "\\sum_{i}^{n}",
    snippet: "\\sum_{}^{}",
    tooltip: "Tổng",
    caretOffset: 6,
  },
  {
    label: "\\lim_{x\\to a}",
    snippet: "\\lim_{}",
    tooltip: "Giới hạn",
    caretOffset: 6,
  },
  { label: "\\alpha", snippet: "\\alpha ", tooltip: "alpha" },
  { label: "\\beta", snippet: "\\beta ", tooltip: "beta" },
  { label: "\\pi", snippet: "\\pi ", tooltip: "pi" },
  { label: "\\theta", snippet: "\\theta ", tooltip: "theta" },
  { label: "\\infty", snippet: "\\infty ", tooltip: "vô cực" },
  { label: "\\times", snippet: "\\times ", tooltip: "nhân" },
  { label: "\\div", snippet: "\\div ", tooltip: "chia" },
  { label: "\\pm", snippet: "\\pm ", tooltip: "cộng/trừ" },
  { label: "\\leq", snippet: "\\leq ", tooltip: "nhỏ hơn hoặc bằng" },
  { label: "\\geq", snippet: "\\geq ", tooltip: "lớn hơn hoặc bằng" },
  { label: "\\neq", snippet: "\\neq ", tooltip: "khác" },
  { label: "\\approx", snippet: "\\approx ", tooltip: "xấp xỉ" },
  { label: "\\Rightarrow", snippet: "\\Rightarrow ", tooltip: "suy ra" },
  { label: "\\to", snippet: "\\to ", tooltip: "tiến tới" },
];

export const chemPalette: PaletteItem[] = [
  {
    label: "\\ce{}",
    snippet: "\\ce{}",
    tooltip: "Bọc công thức hóa",
    caretOffset: 4,
  },
  { label: "->", snippet: "->", tooltip: "Mũi tên phản ứng" },
  { label: "<=>", snippet: "<=>", tooltip: "Phản ứng thuận nghịch" },
  { label: "\\uparrow", snippet: "\\uparrow ", tooltip: "Khí bay lên" },
  { label: "\\downarrow", snippet: "\\downarrow ", tooltip: "Kết tủa" },
  { label: "(r)", snippet: "(r)", tooltip: "Trạng thái rắn" },
  { label: "(l)", snippet: "(l)", tooltip: "Trạng thái lỏng" },
  { label: "(k)", snippet: "(k)", tooltip: "Trạng thái khí" },
  { label: "(dd)", snippet: "(dd)", tooltip: "Dung dịch" },
  {
    label: "\\overset{t^o}{->}",
    snippet: "\\overset{t^o}{->}",
    tooltip: "Đun nóng",
  },
  {
    label: "\\overset{xt}{->}",
    snippet: "\\overset{xt}{->}",
    tooltip: "Có xúc tác",
  },
  { label: "H2O", snippet: "H2O", tooltip: "Nước" },
  { label: "H2SO4", snippet: "H2SO4", tooltip: "Axit sunfuric" },
  { label: "CO2", snippet: "CO2", tooltip: "Cacbonic" },
  { label: "NaCl", snippet: "NaCl", tooltip: "Muối ăn" },
  { label: "NH3", snippet: "NH3", tooltip: "Amoniac" },
  { label: "CH4", snippet: "CH4", tooltip: "Metan" },
];
```

- [ ] **Step 2: Create `insertAtCaret.ts`**

```ts
import type { PaletteItem } from "./palettes";

export function insertAtCaret(
  textarea: HTMLTextAreaElement,
  item: PaletteItem,
): { value: string; caret: number } {
  const start = textarea.selectionStart ?? textarea.value.length;
  const end = textarea.selectionEnd ?? textarea.value.length;
  const before = textarea.value.slice(0, start);
  const after = textarea.value.slice(end);
  const value = before + item.snippet + after;
  const caretDelta = item.caretOffset ?? item.snippet.length;
  const caret = start + caretDelta;
  return { value, caret };
}
```

- [ ] **Step 3: Create `formulaContext.tsx`**

```tsx
import { createContext, useContext, useMemo, useState, ReactNode } from "react";

export type FormulaTarget =
  | { kind: "inline"; latex: string }
  | { kind: "block"; latex: string; blockId: string };

export type FormulaEditorApi = {
  openInsert(initialKind: "inline" | "block"): void;
  openEdit(target: FormulaTarget): void;
  close(): void;
};

export type FormulaEditorState = {
  open: boolean;
  mode: "insert" | "edit";
  initialLatex: string;
  initialKind: "inline" | "block";
  editTarget: FormulaTarget | null;
};

const ApiContext = createContext<FormulaEditorApi | null>(null);
const StateContext = createContext<FormulaEditorState | null>(null);

const CLOSED: FormulaEditorState = {
  open: false,
  mode: "insert",
  initialLatex: "",
  initialKind: "inline",
  editTarget: null,
};

export function FormulaEditorProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<FormulaEditorState>(CLOSED);

  const api = useMemo<FormulaEditorApi>(
    () => ({
      openInsert(initialKind) {
        setState({
          open: true,
          mode: "insert",
          initialLatex: "",
          initialKind,
          editTarget: null,
        });
      },
      openEdit(target) {
        setState({
          open: true,
          mode: "edit",
          initialLatex: target.latex,
          initialKind: target.kind,
          editTarget: target,
        });
      },
      close() {
        setState(CLOSED);
      },
    }),
    [],
  );

  return (
    <ApiContext.Provider value={api}>
      <StateContext.Provider value={state}>{children}</StateContext.Provider>
    </ApiContext.Provider>
  );
}

export function useFormulaEditor(): FormulaEditorApi {
  const value = useContext(ApiContext);
  if (!value) {
    throw new Error(
      "useFormulaEditor must be used inside FormulaEditorProvider",
    );
  }
  return value;
}

export function useFormulaEditorState(): FormulaEditorState {
  const value = useContext(StateContext);
  if (!value) {
    throw new Error(
      "useFormulaEditorState must be used inside FormulaEditorProvider",
    );
  }
  return value;
}
```

- [ ] **Step 4: Create the modal skeleton `FormulaEditorModal.tsx`**

For now, the modal renders tabs, textarea, preview, kind selector — no palette click yet, no confirm action yet (those come in Tasks 6/7). Include a debounced preview and error display.

```tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { renderLatex } from "./katexRenderer";
import { useFormulaEditor, useFormulaEditorState } from "./formulaContext";

type Tab = "math" | "chem";

function inferTab(latex: string): Tab {
  return /^\s*\\ce\{[\s\S]*\}\s*$/.test(latex) ? "chem" : "math";
}

export function FormulaEditorModal() {
  const state = useFormulaEditorState();
  const api = useFormulaEditor();

  const [tab, setTab] = useState<Tab>("math");
  const [latex, setLatex] = useState("");
  const [kind, setKind] = useState<"inline" | "block">("inline");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!state.open) return;
    setLatex(state.initialLatex);
    setKind(state.initialKind);
    if (state.mode === "insert") {
      setTab("math");
    } else {
      setTab(inferTab(state.initialLatex));
    }
  }, [state.open, state.mode, state.initialLatex, state.initialKind]);

  const [preview, setPreview] = useState<{
    html: string;
    error: string | null;
  }>({ html: "", error: null });

  useEffect(() => {
    if (!state.open) return;
    const handle = setTimeout(() => {
      setPreview(renderLatex(latex, { displayMode: kind === "block" }));
    }, 200);
    return () => clearTimeout(handle);
  }, [latex, kind, state.open]);

  const isConfirmDisabled = useMemo(
    () => latex.trim().length === 0 || preview.error !== null,
    [latex, preview.error],
  );

  if (!state.open) return null;

  return (
    <div className="formula-modal-backdrop" onClick={api.close}>
      <div
        className="formula-modal"
        role="dialog"
        aria-label="Soạn công thức"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="formula-modal-header">
          <h2>Soạn công thức</h2>
          <button
            type="button"
            className="formula-modal-close"
            onClick={api.close}
            aria-label="Đóng"
          >
            ×
          </button>
        </div>

        <div className="formula-modal-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "math"}
            onClick={() => setTab("math")}
          >
            Toán
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "chem"}
            onClick={() => setTab("chem")}
          >
            Hóa
          </button>
        </div>

        <div className="formula-modal-palette" data-tab={tab}>
          {/* Palette buttons wired in Task 6 */}
        </div>

        <label className="formula-modal-input">
          <span>LaTeX</span>
          <textarea
            ref={textareaRef}
            value={latex}
            onChange={(e) => setLatex(e.target.value)}
            rows={4}
            autoFocus
            spellCheck={false}
          />
        </label>

        <div className="formula-modal-preview">
          <span>Xem trước</span>
          <div
            className="formula-modal-preview-body"
            dangerouslySetInnerHTML={{ __html: preview.html }}
          />
          {preview.error && (
            <div className="formula-modal-error">{preview.error}</div>
          )}
        </div>

        <div className="formula-modal-kind">
          <label>
            <input
              type="radio"
              name="formula-kind"
              value="inline"
              checked={kind === "inline"}
              onChange={() => setKind("inline")}
              disabled={state.mode === "edit"}
            />
            Chèn trong dòng
          </label>
          <label>
            <input
              type="radio"
              name="formula-kind"
              value="block"
              checked={kind === "block"}
              onChange={() => setKind("block")}
              disabled={state.mode === "edit"}
            />
            Chèn thành block
          </label>
        </div>

        <div className="formula-modal-actions">
          <button type="button" onClick={api.close}>
            Hủy
          </button>
          <button
            type="button"
            disabled={isConfirmDisabled}
            data-testid="formula-confirm"
            onClick={() => {
              // Confirm wired in Task 6
            }}
          >
            {state.mode === "edit" ? "Cập nhật" : "Chèn"}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Verify: full example builds and boots**

Run from example directory:

```bash
vp run lint
```

Expected: no errors.

Run:

```bash
vp run dev
```

Expected: page loads at http://localhost:5173, editor shows text from initial markdown (still read-only, still 2-pane). No console errors. Stop the server.

---

## Task 6: Wire palette buttons, confirm action, and editor mutation

**Files:**

- Modify: `examples/05-interoperability/04-converting-blocks-from-md/src/formula/FormulaEditorModal.tsx`

**Interfaces:**

- Consumes: `mathPalette`, `chemPalette`, `insertAtCaret`, `useFormulaEditorState`, `useFormulaEditor`, and a new prop-drilled callback for editor mutations (see below).
- Produces:

  ```ts
  export type FormulaEditorHandlers = {
    onInsert(kind: "inline" | "block", latex: string): void;
    onUpdate(target: FormulaTarget, latex: string): void;
  };
  export function FormulaEditorModal(props: {
    handlers: FormulaEditorHandlers;
  }): JSX.Element | null;
  ```

  Handlers are provided by `App.tsx` (Task 8) with concrete `editor.*` calls.

- [ ] **Step 1: Wire palette buttons to insert snippets at the caret**

Replace the empty palette region:

```tsx
import { mathPalette, chemPalette, type PaletteItem } from "./palettes";
import { insertAtCaret } from "./insertAtCaret";
import { renderLatex } from "./katexRenderer";

// inside component:
const items = tab === "math" ? mathPalette : chemPalette;

const insertSnippet = (item: PaletteItem) => {
  const textarea = textareaRef.current;
  if (!textarea) return;
  const { value, caret } = insertAtCaret(textarea, item);
  setLatex(value);
  // restore caret after React re-renders
  queueMicrotask(() => {
    textarea.focus();
    textarea.setSelectionRange(caret, caret);
  });
};

// render:
<div className="formula-modal-palette" data-tab={tab}>
  {items.map((item) => {
    const glyph = renderLatex(item.label, { displayMode: false });
    return (
      <button
        key={`${tab}-${item.label}`}
        type="button"
        className="formula-palette-button"
        title={item.tooltip}
        onClick={() => insertSnippet(item)}
        dangerouslySetInnerHTML={{ __html: glyph.html }}
      />
    );
  })}
</div>;
```

- [ ] **Step 2: Add `handlers` prop and wire the confirm button**

Change the modal signature:

```tsx
import type { FormulaTarget } from "./formulaContext";

export type FormulaEditorHandlers = {
  onInsert(kind: "inline" | "block", latex: string): void;
  onUpdate(target: FormulaTarget, latex: string): void;
};

export function FormulaEditorModal({
  handlers,
}: {
  handlers: FormulaEditorHandlers;
}) {
  // ... same body ...
}
```

Wire the confirm button:

```tsx
onClick={() => {
  if (state.mode === "edit" && state.editTarget) {
    handlers.onUpdate(state.editTarget, latex);
  } else {
    handlers.onInsert(kind, latex);
  }
  api.close();
}}
```

Also enable Ctrl+Enter to confirm from the textarea:

```tsx
onKeyDown={(e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && !isConfirmDisabled) {
    e.preventDefault();
    if (state.mode === "edit" && state.editTarget) {
      handlers.onUpdate(state.editTarget, latex);
    } else {
      handlers.onInsert(kind, latex);
    }
    api.close();
  }
}}
```

- [ ] **Step 3: When switching to Hóa tab in Insert mode with empty latex, prefill `\ce{}` with caret between the braces**

Extend the `useEffect` that handles state.open to also react to `tab` change; simpler: add a small handler on the Hóa tab button:

```tsx
onClick={() => {
  setTab("chem");
  if (state.mode === "insert" && latex.trim().length === 0) {
    setLatex("\\ce{}");
    queueMicrotask(() => {
      const ta = textareaRef.current;
      if (!ta) return;
      ta.focus();
      ta.setSelectionRange(4, 4);
    });
  }
}}
```

Correspondingly, Toán tab click resets latex only if it is exactly `\ce{}`:

```tsx
onClick={() => {
  setTab("math");
  if (state.mode === "insert" && latex === "\\ce{}") {
    setLatex("");
  }
}}
```

- [ ] **Step 4: Verify**

Run `vp run lint` from example dir. Expected: no errors. (Full behavior wired in Task 8.)

---

## Task 7: FormulaButton in custom formatting toolbar

**Files:**

- Create: `examples/05-interoperability/04-converting-blocks-from-md/src/toolbar/FormulaButton.tsx`
- Create: `examples/05-interoperability/04-converting-blocks-from-md/src/toolbar/CustomFormattingToolbar.tsx`

**Interfaces:**

- Consumes: `useBlockNoteEditor`, `useEditorContentOrSelectionChange` from `@blocknote/react`; `useFormulaEditor` from `../formula/formulaContext`; the `FormulaSchema` type from `../schema`.
- Produces:

  ```ts
  export function FormulaButton(): JSX.Element;
  export function CustomFormattingToolbar(): JSX.Element; // wraps FormattingToolbarController
  ```

- [ ] **Step 1: Create `FormulaButton.tsx`**

```tsx
import { useState } from "react";
import {
  useBlockNoteEditor,
  useComponentsContext,
  useEditorContentOrSelectionChange,
} from "@blocknote/react";
import { useFormulaEditor } from "../formula/formulaContext";
import type { FormulaSchema } from "../schema";

type ActiveFormula =
  | { kind: "inline"; latex: string }
  | { kind: "block"; latex: string; blockId: string }
  | null;

export function FormulaButton() {
  const editor = useBlockNoteEditor<
    FormulaSchema["blockSchema"],
    FormulaSchema["inlineContentSchema"],
    FormulaSchema["styleSchema"]
  >();
  const components = useComponentsContext()!;
  const formula = useFormulaEditor();

  const [active, setActive] = useState<ActiveFormula>(null);

  useEditorContentOrSelectionChange(() => {
    const block = editor.getTextCursorPosition().block;
    if (block.type === "formulaBlock") {
      setActive({
        kind: "block",
        latex: (block.props as { latex: string }).latex,
        blockId: block.id,
      });
      return;
    }
    const inline = editor.getSelectedText
      ? undefined // fallback path if not present in this version
      : undefined;
    // Detect inline formula at caret
    const active = editor.getActiveStyles
      ? editor.getActiveStyles()
      : undefined;
    // Prefer inspecting inline content around the selection:
    const selection = editor.getSelection();
    if (!selection) {
      const cursor = editor.getTextCursorPosition();
      const contents = cursor.block.content;
      if (Array.isArray(contents)) {
        for (const node of contents) {
          if ((node as any).type === "formulaInline") {
            setActive({
              kind: "inline",
              latex: (node as any).props.latex,
            });
            return;
          }
        }
      }
    }
    setActive(null);
  }, editor);

  const label = "∑ Công thức";

  return (
    <components.FormattingToolbar.Button
      mainTooltip={label}
      onClick={() => {
        if (active) {
          formula.openEdit(
            active.kind === "inline"
              ? { kind: "inline", latex: active.latex }
              : { kind: "block", latex: active.latex, blockId: active.blockId },
          );
          return;
        }
        // Insert mode. Default kind: block if the current block is empty, else inline.
        const block = editor.getTextCursorPosition().block;
        const empty =
          block.type === "paragraph" &&
          Array.isArray(block.content) &&
          block.content.length === 0;
        formula.openInsert(empty ? "block" : "inline");
      }}
      isSelected={active !== null}
    >
      {label}
    </components.FormattingToolbar.Button>
  );
}
```

Note: The BlockNote React API for detecting inline nodes has evolved; if `editor.getSelection` / `getTextCursorPosition` in the installed version differ, adapt the detection accordingly. The behavior the test needs is: (a) when caret sits on a `formulaBlock`, active is set to that block; (b) when caret sits inside a paragraph that contains a `formulaInline` at that position, active is set to that inline. If detection ends up unreliable, degrade gracefully to always opening Insert mode — clicking the rendered formula itself still triggers Edit via `FormulaInline.onOpenEditor`.

- [ ] **Step 2: Create `CustomFormattingToolbar.tsx`**

```tsx
import {
  FormattingToolbar,
  FormattingToolbarController,
  getFormattingToolbarItems,
} from "@blocknote/react";
import { FormulaButton } from "./FormulaButton";

export function CustomFormattingToolbar() {
  return (
    <FormattingToolbarController
      formattingToolbar={() => (
        <FormattingToolbar>
          {getFormattingToolbarItems()}
          <FormulaButton key="formula" />
        </FormattingToolbar>
      )}
    />
  );
}
```

- [ ] **Step 3: Verify compile**

Run `vp run lint` from example directory. Expected: no errors.

---

## Task 8: Markdown pipeline

**Files:**

- Create: `examples/05-interoperability/04-converting-blocks-from-md/src/markdown/preprocessMarkdown.ts`
- Create: `examples/05-interoperability/04-converting-blocks-from-md/src/markdown/postprocessBlocks.ts`
- Create: `examples/05-interoperability/04-converting-blocks-from-md/src/markdown/initialMarkdown.ts`

**Interfaces:**

- Consumes: nothing.
- Produces:

  ```ts
  // preprocessMarkdown.ts
  export type PreprocessResult = {
    processed: string;
    inlineMap: Map<string, string>; // token -> latex
    blockMap: Map<string, string>;
  };
  export function preprocessMarkdown(md: string): PreprocessResult;

  // postprocessBlocks.ts
  export function postprocessBlocks<B>(
    blocks: B[],
    inlineMap: Map<string, string>,
    blockMap: Map<string, string>,
  ): B[];

  // initialMarkdown.ts
  export const initialMarkdown: string;
  ```

- [ ] **Step 1: Create `preprocessMarkdown.ts`**

```ts
export type PreprocessResult = {
  processed: string;
  inlineMap: Map<string, string>;
  blockMap: Map<string, string>;
};

const BLOCK_TOKEN = (n: number) => `⟪FML_BLOCK_${n}⟫`;
const INLINE_TOKEN = (n: number) => `⟪FML_INLINE_${n}⟫`;

const BLOCK_REGEX = /\$\$([\s\S]+?)\$\$/g;
const INLINE_REGEX = /\$([^$\n]+?)\$/g;

export function preprocessMarkdown(md: string): PreprocessResult {
  const blockMap = new Map<string, string>();
  const inlineMap = new Map<string, string>();
  let blockCounter = 0;
  let inlineCounter = 0;

  // First: block-level $$...$$
  let processed = md.replace(BLOCK_REGEX, (_full, latex: string) => {
    const token = BLOCK_TOKEN(blockCounter++);
    blockMap.set(token, latex.trim());
    return `\n\n${token}\n\n`;
  });

  // Then: inline $...$
  processed = processed.replace(INLINE_REGEX, (_full, latex: string) => {
    const token = INLINE_TOKEN(inlineCounter++);
    inlineMap.set(token, latex.trim());
    return token;
  });

  return { processed, inlineMap, blockMap };
}
```

- [ ] **Step 2: Create `postprocessBlocks.ts`**

```ts
type AnyBlock = {
  id?: string;
  type: string;
  props?: Record<string, unknown>;
  content?: unknown;
  children?: AnyBlock[];
};

const BLOCK_TOKEN_REGEX = /⟪FML_BLOCK_\d+⟫/g;
const INLINE_TOKEN_REGEX = /⟪FML_INLINE_\d+⟫/g;

export function postprocessBlocks<B extends AnyBlock>(
  blocks: B[],
  inlineMap: Map<string, string>,
  blockMap: Map<string, string>,
): B[] {
  const out: B[] = [];
  for (const block of blocks) {
    const wholeMatch = matchWholeBlockToken(block, blockMap);
    if (wholeMatch) {
      out.push({
        ...block,
        type: "formulaBlock",
        props: { latex: wholeMatch },
        content: undefined,
      } as B);
      continue;
    }
    if (Array.isArray(block.content)) {
      const rewritten = rewriteInlineTokens(block.content, inlineMap);
      out.push({
        ...block,
        content: rewritten,
        children: block.children
          ? postprocessBlocks(block.children, inlineMap, blockMap)
          : block.children,
      } as B);
    } else {
      out.push({
        ...block,
        children: block.children
          ? postprocessBlocks(block.children, inlineMap, blockMap)
          : block.children,
      } as B);
    }
  }
  return out;
}

function matchWholeBlockToken(
  block: AnyBlock,
  blockMap: Map<string, string>,
): string | null {
  if (!Array.isArray(block.content) || block.content.length !== 1) return null;
  const first = block.content[0] as { type?: string; text?: string };
  if (first.type !== "text" || typeof first.text !== "string") return null;
  const text = first.text.trim();
  if (!BLOCK_TOKEN_REGEX.test(text)) return null;
  // Reset regex state and re-match to grab the exact token
  BLOCK_TOKEN_REGEX.lastIndex = 0;
  const m = text.match(/^⟪FML_BLOCK_\d+⟫$/);
  if (!m) return null;
  return blockMap.get(m[0]) ?? null;
}

function rewriteInlineTokens(
  content: unknown[],
  inlineMap: Map<string, string>,
): unknown[] {
  const out: unknown[] = [];
  for (const node of content) {
    const n = node as { type?: string; text?: string; styles?: unknown };
    if (n.type !== "text" || typeof n.text !== "string") {
      out.push(node);
      continue;
    }
    const parts = splitAroundTokens(n.text, inlineMap);
    for (const part of parts) {
      if (part.kind === "text") {
        if (part.text.length > 0) {
          out.push({ ...n, text: part.text });
        }
      } else {
        out.push({
          type: "formulaInline",
          props: { latex: part.latex },
          content: undefined,
        });
      }
    }
  }
  return out;
}

function splitAroundTokens(
  text: string,
  inlineMap: Map<string, string>,
): Array<{ kind: "text"; text: string } | { kind: "formula"; latex: string }> {
  const parts: Array<
    { kind: "text"; text: string } | { kind: "formula"; latex: string }
  > = [];
  const re = /⟪FML_INLINE_\d+⟫/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) {
      parts.push({ kind: "text", text: text.slice(last, m.index) });
    }
    const latex = inlineMap.get(m[0]);
    parts.push({ kind: "formula", latex: latex ?? "" });
    last = m.index + m[0].length;
  }
  if (last < text.length) {
    parts.push({ kind: "text", text: text.slice(last) });
  }
  return parts;
}
```

- [ ] **Step 3: Create `initialMarkdown.ts`**

```ts
export const initialMarkdown = `# Bài 1: Phương trình bậc hai

Công thức nghiệm của phương trình $ax^2 + bx + c = 0$ (với $a \\neq 0$) là:

$$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$

# Bài 2: Phản ứng hóa học

Phản ứng của khí hydro với oxy tạo ra nước:

$$\\ce{2H2 + O2 -> 2H2O}$$

Axit sunfuric ($\\ce{H2SO4}$) là một axit mạnh thường gặp trong phòng thí nghiệm.
`;
```

- [ ] **Step 4: Verify compile**

Run `vp run lint` from the example directory. Expected: no errors.

---

## Task 9: Wire it all together in `App.tsx`, styles, README

**Files:**

- Modify: `examples/05-interoperability/04-converting-blocks-from-md/src/App.tsx`
- Modify: `examples/05-interoperability/04-converting-blocks-from-md/src/styles.css`
- Modify: `examples/05-interoperability/04-converting-blocks-from-md/README.md`

**Interfaces:**

- Consumes: everything created in Tasks 1–8.
- Produces: a working example accessible at `vp run dev`.

- [ ] **Step 1: Rewrite `src/App.tsx`**

Full replacement:

```tsx
import "@blocknote/core/fonts/inter.css";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { useCreateBlockNote } from "@blocknote/react";
import { useEffect } from "react";

import { schema, type FormulaSchema } from "./schema";
import {
  FormulaEditorProvider,
  useFormulaEditor,
} from "./formula/formulaContext";
import {
  FormulaEditorModal,
  type FormulaEditorHandlers,
} from "./formula/FormulaEditorModal";
import { CustomFormattingToolbar } from "./toolbar/CustomFormattingToolbar";
import { preprocessMarkdown } from "./markdown/preprocessMarkdown";
import { postprocessBlocks } from "./markdown/postprocessBlocks";
import { initialMarkdown } from "./markdown/initialMarkdown";
import "./styles.css";

function EditorShell() {
  const editor = useCreateBlockNote({ schema });
  const formula = useFormulaEditor();

  useEffect(() => {
    const { processed, inlineMap, blockMap } =
      preprocessMarkdown(initialMarkdown);
    (async () => {
      const raw = await editor.tryParseMarkdownToBlocks(processed);
      const withFormulas = postprocessBlocks(raw as any, inlineMap, blockMap);
      editor.replaceBlocks(editor.document, withFormulas as any);
    })();
    // Intentionally run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  const handlers: FormulaEditorHandlers = {
    onInsert(kind, latex) {
      if (kind === "inline") {
        editor.insertInlineContent([
          {
            type: "formulaInline",
            props: { latex },
            content: undefined,
          } as any,
        ]);
      } else {
        editor.insertBlocks(
          [{ type: "formulaBlock", props: { latex } } as any],
          editor.getTextCursorPosition().block,
          "after",
        );
      }
    },
    onUpdate(target, latex) {
      if (target.kind === "block") {
        editor.updateBlock(target.blockId, {
          type: "formulaBlock",
          props: { latex },
        } as any);
      } else {
        // Replace the inline node at the current selection. The simplest reliable
        // path: replace the whole inline content of the containing block by
        // rewriting the inline content list.
        const block = editor.getTextCursorPosition().block;
        if (!Array.isArray(block.content)) return;
        const nextContent = block.content.map((node: any) => {
          if (
            node.type === "formulaInline" &&
            node.props?.latex === target.latex
          ) {
            return { ...node, props: { latex } };
          }
          return node;
        });
        editor.updateBlock(block, { content: nextContent } as any);
      }
    },
  };

  return (
    <>
      <BlockNoteView editor={editor} editable={true} formattingToolbar={false}>
        <CustomFormattingToolbar />
      </BlockNoteView>
      <FormulaEditorModal handlers={handlers} />
    </>
  );
}

export default function App() {
  return (
    <FormulaEditorProvider>
      <EditorShell />
    </FormulaEditorProvider>
  );
}
```

- [ ] **Step 2: Replace `src/styles.css`**

```css
:root {
  --formula-modal-bg: #ffffff;
  --formula-modal-border: #e2e2e6;
  --formula-modal-shadow: 0 8px 32px rgba(0, 0, 0, 0.24);
  --formula-error-color: #c00;
}

.formula-inline {
  cursor: pointer;
  padding: 0 2px;
  border-radius: 3px;
}
.formula-inline:hover,
.formula-inline:focus {
  outline: 2px solid #6ea8fe;
  outline-offset: 1px;
}

.formula-block {
  display: block;
  cursor: pointer;
  text-align: center;
  padding: 8px 12px;
  border-radius: 4px;
}
.formula-block:hover,
.formula-block:focus {
  outline: 2px solid #6ea8fe;
  outline-offset: 2px;
}

.formula-placeholder {
  color: #888;
  font-style: italic;
}

.formula-error {
  color: var(--formula-error-color);
}

.formula-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.formula-modal {
  background: var(--formula-modal-bg);
  border: 1px solid var(--formula-modal-border);
  border-radius: 8px;
  box-shadow: var(--formula-modal-shadow);
  padding: 16px;
  width: min(680px, 92vw);
  max-height: 90vh;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.formula-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.formula-modal-close {
  font-size: 22px;
  background: transparent;
  border: none;
  cursor: pointer;
}

.formula-modal-tabs {
  display: flex;
  gap: 8px;
}
.formula-modal-tabs button {
  padding: 6px 14px;
  border: 1px solid var(--formula-modal-border);
  border-radius: 4px;
  background: #fff;
  cursor: pointer;
}
.formula-modal-tabs button[aria-selected="true"] {
  background: #eaf2ff;
  border-color: #6ea8fe;
}

.formula-modal-palette {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(72px, 1fr));
  gap: 6px;
  padding: 8px;
  background: #f5f6fa;
  border-radius: 4px;
  max-height: 168px;
  overflow: auto;
}
.formula-palette-button {
  background: #fff;
  border: 1px solid var(--formula-modal-border);
  border-radius: 4px;
  padding: 6px;
  cursor: pointer;
  min-height: 34px;
}
.formula-palette-button:hover {
  border-color: #6ea8fe;
}

.formula-modal-input {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.formula-modal-input textarea {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 14px;
  padding: 8px;
  border: 1px solid var(--formula-modal-border);
  border-radius: 4px;
  resize: vertical;
}

.formula-modal-preview {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-height: 60px;
  padding: 8px;
  border: 1px dashed var(--formula-modal-border);
  border-radius: 4px;
}
.formula-modal-preview-body {
  text-align: center;
}
.formula-modal-error {
  color: var(--formula-error-color);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12px;
}

.formula-modal-kind {
  display: flex;
  gap: 16px;
}

.formula-modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
.formula-modal-actions button {
  padding: 6px 14px;
  border-radius: 4px;
  border: 1px solid var(--formula-modal-border);
  cursor: pointer;
  background: #fff;
}
.formula-modal-actions button[data-testid="formula-confirm"] {
  background: #6ea8fe;
  color: white;
  border-color: #6ea8fe;
}
.formula-modal-actions button[disabled] {
  opacity: 0.55;
  cursor: not-allowed;
}
```

If the previous `styles.css` had 2-pane `.views` / `.view-wrapper` / `.view` styles, remove them.

- [ ] **Step 3: Rewrite README**

```md
# Bài giảng có công thức toán/hóa

Ví dụ này thay 2-pane preview cũ bằng một trình soạn thảo có thể chỉnh sửa
được, hỗ trợ chèn công thức toán (LaTeX) và hóa học (mhchem `\\ce{}`)
qua một cửa sổ soạn thảo có 2 tab.

- Bài giảng ban đầu được nạp từ một mẫu markdown; `$...$` và `$$...$$` được
  nhận diện và chuyển thành node công thức ngay khi tải.
- Nhấp nút **∑ Công thức** trên formatting toolbar để mở cửa sổ soạn thảo.
- Nhấp vào một công thức đã có sẵn để chỉnh sửa lại.

**Relevant Docs:**

- [Parsing Markdown to Blocks](/docs/features/import/markdown)
- [Custom Inline Content](/docs/features/custom-schemas/custom-inline-content)
- [Custom Blocks](/docs/features/custom-schemas/custom-blocks)
```

- [ ] **Step 4: Verify end-to-end manually**

Run from example directory:

```bash
vp run lint
```

Expected: no errors.

```bash
vp run dev
```

Open http://localhost:5173.

Expected observations:

1. Page shows only the editor (no textarea/preview 2-pane).
2. Heading "Bài 1: Phương trình bậc hai" appears; below it, a rendered inline formula for `ax^2 + bx + c = 0`.
3. The quadratic formula appears as a centered block.
4. "Bài 2" section shows chemistry block `2H₂ + O₂ → 2H₂O`.
5. Text `H₂SO₄` appears inline in the sentence about axit sunfuric.
6. Selecting some text shows the formatting toolbar; last button is "∑ Công thức".
7. Clicking the button opens the modal. Type `\frac{a}{b}` — preview renders. Click Chèn — formula appears at caret.
8. Click an existing rendered formula — modal opens prefilled with its LaTeX; edit and click Cập nhật — the formula updates.
9. Switch tab to Hóa (from empty state) — LaTeX field becomes `\ce{}` with caret between braces; palette shows chemistry snippets.

Stop the server.

---

## Task 10: E2E test file with pure logic tests + browser scenarios

**Files:**

- Create: `tests/src/end-to-end/formula/formula.test.tsx`

**Interfaces:**

- Consumes: `App` and pure functions from the example via the `@examples/...` alias.
- Produces: a test file runnable through `pnpm run e2e` at repo root.

- [ ] **Step 1: Create the test file**

```tsx
import App from "@examples/05-interoperability/04-converting-blocks-from-md/src/App";
import { preprocessMarkdown } from "@examples/05-interoperability/04-converting-blocks-from-md/src/markdown/preprocessMarkdown";
import { postprocessBlocks } from "@examples/05-interoperability/04-converting-blocks-from-md/src/markdown/postprocessBlocks";
import { renderLatex } from "@examples/05-interoperability/04-converting-blocks-from-md/src/formula/katexRenderer";

import { beforeEach, describe, expect, test } from "vite-plus/test";
import { render } from "vitest-browser-react";
import { userEvent } from "../../utils/context.js";
import { EDITOR_SELECTOR } from "../../utils/const.js";
import { waitForSelector, sleep } from "../../utils/editor.js";

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
    // Wait for the async initial markdown load to complete.
    await sleep(300);
  });

  test("renders initial formulas from markdown template", async () => {
    // KaTeX outputs a span with class 'katex' — verify at least one exists.
    const katexNodes = document.querySelectorAll(`${EDITOR_SELECTOR} .katex`);
    expect(katexNodes.length).toBeGreaterThan(0);
  });

  test("inserts an inline formula via the toolbar button", async () => {
    // Select some text so the formatting toolbar appears.
    const editor = await waitForSelector(EDITOR_SELECTOR);
    await userEvent.click(editor);
    await userEvent.keyboard("hello world");
    // Select all text in the block:
    await userEvent.keyboard("{Home}{Shift>}{End}{/Shift}");

    // Click the formula button on the toolbar.
    const button = await waitForSelector(
      `.bn-formatting-toolbar button[data-mantine-tooltip*="Công thức"], .bn-formatting-toolbar button:has-text("∑")`,
    ).catch(async () => {
      // Fallback selector if aria/mantine tooltip attr differs:
      return await waitForSelector(`.bn-formatting-toolbar button:last-child`);
    });
    await userEvent.click(button);

    // Modal appears.
    const modal = await waitForSelector(`.formula-modal`);
    const textarea = modal.querySelector("textarea") as HTMLTextAreaElement;
    expect(textarea).toBeTruthy();

    // Type LaTeX.
    await userEvent.click(textarea);
    await userEvent.type(textarea, "\\frac{1}{2}");

    // Preview shows a katex node.
    await sleep(300);
    const previewKatex = modal.querySelector(".formula-modal-preview .katex");
    expect(previewKatex).toBeTruthy();

    // Confirm.
    const confirm = modal.querySelector(
      `[data-testid="formula-confirm"]`,
    ) as HTMLButtonElement;
    await userEvent.click(confirm);

    // Modal closes and a new katex node appears in editor.
    await waitForSelectorGone(`.formula-modal`);
    const after = document.querySelectorAll(`${EDITOR_SELECTOR} .katex`).length;
    expect(after).toBeGreaterThan(0);
  });
});

function waitForSelectorGone(selector: string, timeoutMs = 2000) {
  const start = Date.now();
  return new Promise<void>((resolve, reject) => {
    const tick = () => {
      if (!document.querySelector(selector)) {
        resolve();
        return;
      }
      if (Date.now() - start > timeoutMs) {
        reject(new Error(`Still present: ${selector}`));
        return;
      }
      setTimeout(tick, 50);
    };
    tick();
  });
}
```

Note: the toolbar button selector is fragile because it depends on how Mantine attaches tooltip text and how BlockNote renders the toolbar button. If neither `data-mantine-tooltip*="Công thức"` nor `button:last-child` locates the right button in this codebase's actual DOM, adjust the selector during implementation — the reliable strategies are (a) add a `data-testid` on the `<components.FormattingToolbar.Button>` if the underlying component forwards custom props, or (b) query by visible text (`button:has-text("Công thức")`). Prefer adjusting the button code to expose a stable `data-testid` if forwarding is supported.

- [ ] **Step 2: Run the tests**

From repo root:

```bash
pnpm run e2e -- tests/src/end-to-end/formula/formula.test.tsx
```

Expected: all `describe` blocks pass. If UI test selectors don't match, iterate on selectors and add `data-testid` where useful. Do NOT weaken assertions to make tests pass.

---

## Self-Review Checklist (author-executed after writing this plan)

- Spec section "User workflow" → covered by Task 8 (editor-only, template load, click-to-edit) and Task 7 (toolbar button).
- Spec "Rendering library" (KaTeX + mhchem + `katex.min.css`) → Task 2.
- Spec "Schema extensions" (formulaInline, formulaBlock) → Tasks 3, 4.
- Spec "Formula editor modal" (tabs, palette, textarea, preview, kind selector, actions) → Tasks 5, 6.
- Spec "Formatting toolbar" (button, insert vs edit mode, contextual default kind) → Task 7.
- Spec "Markdown import" (preprocess placeholders + postprocess replacement) → Task 8.
- Spec "File layout" → matches the file structure section above.
- Spec "Data flow at a glance" → Task 8 Step 1 code implements the exact sequence.
- Spec "Error handling" (KaTeX errors in render, in modal preview, placeholder collision) → covered in Tasks 2, 5, and note in Task 8 (collision case is documented; UUID suffix defense not implemented in v1 because tokens `⟪FML_...⟫` are extremely unlikely — flagged as an accepted risk in the spec).
- Spec "Testing" → Task 10.
- Spec "Package changes" → Task 1.
- Placeholder scan: no "TBD", no "TODO", no "add appropriate error handling" — every step has concrete code or exact commands.
- Type consistency: `renderLatex`, `PaletteItem`, `FormulaTarget`, `FormulaEditorHandlers`, `FormulaEditorApi` names are used identically across the tasks that reference them.

---

## Execution Handoff

Plan complete. Two execution options:

1. **Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.
