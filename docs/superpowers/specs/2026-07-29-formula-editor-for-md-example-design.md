# Formula Editor for the Markdown-Import Example

**Date:** 2026-07-29
**Target directory:** `examples/05-interoperability/04-converting-blocks-from-md`
**Audience:** teachers with basic computer skills using markdown templates to author lecture materials

## Goal

Turn the existing `04-converting-blocks-from-md` example (currently a read-only preview of markdown) into an editable, teacher-friendly editor that supports inserting and editing math and chemistry formulas. Markdown remains the way an existing lecture template is loaded, but the teacher's day-to-day interaction happens entirely inside the editor.

## Non-goals

- Automatic balancing of chemical equations.
- 2D molecular structure drawing.
- Exporting to markdown / PDF / DOCX (deferred).
- Real-time collaboration.
- Rendering math with anything other than KaTeX (MathJax and others are out of scope).

## User workflow

1. Teacher opens the example. An initial markdown template is loaded into the editor once at startup.
2. Any `$...$` and `$$...$$` in that template become editable formula nodes rendered by KaTeX (with mhchem for chemistry).
3. Teacher edits text directly in the editor.
4. To insert a new formula: teacher clicks the "∑ Công thức" button on the formatting toolbar → a modal opens.
5. To edit an existing formula: teacher clicks the rendered formula in the editor → the same modal opens pre-filled with its LaTeX.
6. Inside the modal, teacher picks tab **Toán** or **Hóa**, uses a palette of symbol buttons or types LaTeX directly, sees a live KaTeX preview, and confirms.

## Architecture

### Rendering library

- Use `katex` for LaTeX rendering.
- Register `katex/contrib/mhchem` once at module load so `\ce{...}` works.
- Use `katex.renderToString(...)` and inject the result via `dangerouslySetInnerHTML` into a `<span>` (inline) or `<div>` (block).
- Load `katex/dist/katex.min.css` once in the example entry.

### BlockNote schema extensions

Two new node types, both storing raw LaTeX as a single string prop:

- **`formulaInline`** — inline content spec (via `createReactInlineContentSpec`)
  - `propSchema: { latex: { default: "" } }`
  - `content: "none"` (no editable text inside; the node is atomic from the editor's perspective)
- **`formulaBlock`** — block spec (via `createReactBlockSpec`)
  - `propSchema: { latex: { default: "" } }`
  - `content: "none"`; renders as a centered div

Registered via `BlockNoteSchema.create({ inlineContentSpecs: { ...defaultInlineContentSpecs, formulaInline }, blockSpecs: { ...defaultBlockSpecs, formulaBlock } })`.

### Data model choice

A single formula node type is used for both math and chemistry. Chemistry expressions are stored as LaTeX using mhchem (`\ce{...}`). This keeps the schema minimal and the popup uniform; the tab in the modal only affects which palette is shown and whether the initial snippet is wrapped in `\ce{...}`, not the storage format.

If, in the future, chemistry needs distinct behavior (validation, balancing, palette-only editing), the model can be migrated by scanning `latex` for `\ce{...}` occurrences and renaming the node — no data loss.

## Editor UI

### Formatting toolbar

Extend the default `FormattingToolbar` via `FormattingToolbarController` with a slot render:

- Add a button `FormulaButton` labeled "∑ Công thức".
- The button is always visible (not gated by selection type).
- Behavior:
  - If the current selection is entirely inside an existing `formulaInline` or the caret is on an existing `formulaBlock`: open modal in **Edit** mode, prefilled with that node's `latex` and its `kind` (inline vs block from the node type).
  - Otherwise: open modal in **Insert** mode with an empty LaTeX field. The default kind radio is set contextually: `inline` if the current selection is inside a paragraph with other content, otherwise `block`.

### Formula editor modal

A centered modal (~640×420, responsive), plain React, styled with the example's `styles.css` and Mantine tokens where reasonable.

Regions, top to bottom:

1. **Header:** title ("Soạn công thức") and close (×) button.
2. **Tabs:** two tabs — **Toán** and **Hóa**. Switching tab swaps the palette; it does not clear the LaTeX field. In Insert mode, the initial content differs by tab (Toán: empty; Hóa: `\ce{}` with the caret between the braces). In Edit mode, the tab is auto-selected: if the raw LaTeX matches `/^\s*\\ce\{.*\}\s*$/` it starts on Hóa, else on Toán.
3. **Palette:** a grid of buttons that insert LaTeX snippets at the caret position of the LaTeX textarea. Each button shows a rendered KaTeX glyph and, on hover, a Vietnamese tooltip explaining what it inserts. Snippets are defined in `palettes.ts` (see below).
4. **LaTeX input:** a monospaced `<textarea>`, ~4 rows, autoFocus. This is the source of truth. Users familiar with LaTeX can bypass the palette entirely.
5. **Preview:** live-rendered KaTeX output, debounced 200ms after last keystroke. If KaTeX throws a parse error, show the error message in red below the preview area; the confirm button is disabled until the LaTeX parses.
6. **Kind selector:** radio group — **Chèn trong dòng** vs **Chèn thành block**. Disabled and locked to the current node type when in Edit mode (changing kind on edit is out of scope for v1).
7. **Actions:** **Hủy** and **Chèn**/**Cập nhật**. Enter inside the textarea inserts a newline (LaTeX may span lines). Ctrl+Enter confirms.

### Palette contents

`palettes.ts` exports:

- `mathPalette: PaletteItem[]` — at minimum: `x^{}` (mũ), `x_{}` (chỉ số dưới), `\frac{}{}` (phân số), `\sqrt{}` (căn bậc hai), `\sqrt[n]{}` (căn bậc n), `\int_{}^{}` (tích phân), `\sum_{}^{}` (tổng), `\lim_{}` (giới hạn), `\alpha`, `\beta`, `\pi`, `\theta`, `\infty`, `\times`, `\div`, `\pm`, `\leq`, `\geq`, `\neq`, `\approx`, `\Rightarrow`, `\to`.
- `chemPalette: PaletteItem[]` — at minimum: `\ce{}` (bọc), `->` (mũi tên phản ứng), `<=>` (thuận nghịch), `\uparrow` (khí bay lên), `\downarrow` (kết tủa), `(r)`, `(l)`, `(k)`, `(dd)`, `+`, `\overset{t^o}{->}` (điều kiện nhiệt độ trên mũi tên), `\overset{xt}{->}` (xúc tác), then quick-insert buttons for common formulas: `H2O`, `H2SO4`, `CO2`, `NaCl`, `NH3`, `CH4`.

Each `PaletteItem` shape:

```ts
type PaletteItem = {
  label: string; // KaTeX snippet used as button glyph
  snippet: string; // text to insert at caret
  tooltip: string; // Vietnamese description
  caretOffset?: number; // where to place caret after insertion (default: end of snippet)
};
```

### Render components

- **`FormulaInline`** — renders the `latex` prop via KaTeX in inline mode. `onClick` opens the modal in Edit mode. Adds a subtle hover outline so teachers know it is clickable. If KaTeX throws, render a red placeholder `[?]` with the raw LaTeX as `title` attribute.
- **`FormulaBlock`** — same, but in display mode. Centered horizontally. On click, opens the modal. On empty `latex`, shows a placeholder ("Nhấp để soạn công thức").

## Markdown import

Preprocess the markdown string before calling `tryParseMarkdownToBlocks`:

1. Regex 1: `/\$\$([\s\S]+?)\$\$/g` (non-greedy). Each match is replaced with a placeholder token `⟪FML_BLOCK_{n}⟫` on its own line, and the captured LaTeX is stored in a map `blockMap: Map<number, string>`.
2. Regex 2: `/\$([^$\n]+?)\$/g` (single-line, non-greedy). Each match becomes `⟪FML_INLINE_{n}⟫`, stored in `inlineMap`.

After `tryParseMarkdownToBlocks` returns, walk the block tree:

- For each block, if its inline content is a text node whose value contains `⟪FML_INLINE_{n}⟫`, split the text around the token and replace the token with `{ type: "formulaInline", props: { latex: inlineMap.get(n) } }`.
- For each block whose sole content is exactly a `⟪FML_BLOCK_{n}⟫` token, replace the whole block with `{ type: "formulaBlock", props: { latex: blockMap.get(n) } }`.

Edge cases and how they are handled in v1:

- A stray `$` (e.g., a dollar sign in text like `$5`) will be left as-is because Regex 2 requires a matching closing `$` before end-of-line. This is acceptable; teachers can correct the imported markdown template if needed.
- Escaped `\$` in markdown is not specially handled in v1 (rare in lecture templates).
- Nested `$$ ... $ ... $$` is not supported and produces best-effort output; the pre-processor is documented as best-effort.

## File layout

Inside `examples/05-interoperability/04-converting-blocks-from-md`:

```
src/
  App.tsx                          // editor-only, editable=true, loads initial markdown once
  schema.ts                        // formulaInline + formulaBlock specs, extended BlockNoteSchema
  formula/
    katexRenderer.ts               // registers mhchem, exports renderLatex(latex, {displayMode})
    FormulaInline.tsx              // inline React component
    FormulaBlock.tsx               // block React component
    FormulaEditorModal.tsx         // modal with tabs, palette, textarea, preview
    palettes.ts                    // mathPalette, chemPalette, PaletteItem type
    formulaContext.tsx             // React context: openInsert(), openEdit(node), state
  markdown/
    preprocessMarkdown.ts          // replace $..$/$$..$$ with placeholders + return maps
    postprocessBlocks.ts           // walk blocks and swap placeholders for formula nodes
  toolbar/
    FormulaButton.tsx              // toolbar button, uses formulaContext
    CustomFormattingToolbar.tsx    // wraps default toolbar and injects FormulaButton
  styles.css                       // modal styling + FormulaBlock centering + hover state
  vite-env.d.ts
main.tsx
index.html
package.json                       // add "katex" dependency (peerDeps unchanged)
README.md                          // updated to describe the new capability
```

The example continues to be independently runnable via `vp run dev` from repo root and served under the examples list.

## Data flow at a glance

1. Mount → `initialMarkdown` string constant is fed through `preprocessMarkdown` → `{ processed, inlineMap, blockMap }`.
2. `editor.tryParseMarkdownToBlocks(processed)` → returns default blocks with placeholder text.
3. `postprocessBlocks(blocks, inlineMap, blockMap)` → returns blocks with `formulaInline` / `formulaBlock` in the right places.
4. `editor.replaceBlocks(editor.document, transformedBlocks)`.
5. Teacher edits. Formula nodes render via `renderLatex`. Clicks call `formulaContext.openEdit(node)`.
6. Modal on confirm calls `editor.updateBlock` or the inline-content API to persist new LaTeX.

## Error handling

- KaTeX parse errors inside `renderLatex`: caught and rendered as `[?]` with the raw LaTeX as tooltip (never crash the editor).
- KaTeX parse errors inside the modal preview: shown as red text; confirm disabled.
- Preprocess placeholder collision (extremely unlikely, but defensive): the token uses double-angle brackets `⟪ ⟫` which are outside typical lecture text; if the markdown already contains one, prepend a UUID suffix so replacement remains unique.

## Testing

- **Unit** (`vp run test`):
  - `preprocessMarkdown` — inputs covering: no formulas, one `$...$`, one `$$...$$`, both, dollar signs in text (`$5`), multi-line block formulas.
  - `postprocessBlocks` — verify placeholder-in-text-splitting and standalone-block replacement.
  - `renderLatex` — smoke test that `\frac{1}{2}` and `\ce{H2SO4}` both produce non-empty HTML strings and that malformed LaTeX throws (caller handles).
- **E2E** (`vp run e2e`, Playwright):
  - Load example → verify initial formula from template renders.
  - Click toolbar button → modal appears → type `\frac{1}{2}` → preview renders → click Chèn → formula appears in editor at caret.
  - Click existing formula → modal opens prefilled → change LaTeX → Cập nhật → editor updates.
  - Tab switch inside modal preserves LaTeX field content.

## Package changes

- Add `katex` to the example's `package.json` dependencies. `mhchem` ships with KaTeX; no extra dep.
- No changes to any published `@blocknote/*` package. All new code lives inside the example.

## Open items (accepted for v1, noted for later)

- Keyboard shortcut for the toolbar button (Ctrl+M?). Deferred; discoverability of the toolbar button is enough for teachers.
- Localized labels: everything is in Vietnamese; there is no i18n framework for the example. Deferred.
- Editing kind (inline↔block) after creation: deferred — teachers can delete and re-insert.
- Markdown export with `$...$` round-trip: out of scope for v1.
