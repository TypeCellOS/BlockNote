# @blocknote/xl-pdf-renderer-2

Accessible (**PDF/UA-1**) PDF export for BlockNote, powered by the
[Typst](https://typst.app) engine. A tagged-PDF replacement for
`@blocknote/xl-pdf-exporter` (which is built on react-pdf and emits untagged
PDFs — see [#2806](https://github.com/TypeCellOS/BlockNote/issues/2806)).

## Why

react-pdf produces no logical structure (`/StructTreeRoot`), so screen readers
can't understand exported documents. Typst 0.15 emits a fully tagged tag tree
(`Document › H1 › P › L›LI › Table›TH/TD › Figure+Alt › Link › Code`) by
default, and the output validates as PDF/UA-1 with veraPDF.

## Pipeline

```
BlockNote blocks
   │  TypstExporter.toTypst()        (pure; runs anywhere)
   ▼
Typst markup
   │  compileTypstToTaggedPdf()      (wasm Typst engine, client-side)
   ▼
tagged PDF
   │  declarePdfUA()                 (@cantoo/pdf-lib; adds the UA-1 declaration)
   ▼
PDF/UA-1   ──►  verify with veraPDF --flavour ua1
```

Why the last step exists: the published Typst wasm binding can produce a tagged
PDF but does not expose the `--pdf-standard ua-1` export option, so two
declarations (`/ViewerPreferences/DisplayDocTitle` and the `pdfuaid` XMP) are
added in JS. Conformance is verified end-to-end in `src/pdfua/golden.test.ts`
(runs veraPDF when it's installed).

## Usage

```ts
import {
  TypstExporter,
  typstDefaultSchemaMappings,
  blocksToPdfUA,
} from "@blocknote/xl-pdf-renderer-2";
import wasmUrl from "@myriaddreamin/typst-ts-web-compiler/pkg/typst_ts_web_compiler_bg.wasm?url";
import emojiFont from "./NotoEmoji-Regular.ttf"; // bundle an emoji font for full UA-1

const exporter = new TypstExporter(editor.schema, typstDefaultSchemaMappings, {
  title: "My document", // required for PDF/UA
  lang: "en",
});

const pdfBytes = await blocksToPdfUA(exporter, editor.document, {
  getModule: () => wasmUrl,
  fonts: [new Uint8Array(await (await fetch(emojiFont)).arrayBuffer())],
});
```

Lower-level building blocks (`toTypst`, `compileTypstToTaggedPdf`,
`declarePdfUA`) are exported individually if you need a server-side or custom
compile step.

### Math & diagram blocks

`@blocknote/math-block` and `@blocknote/diagram-block` ship Typst mappings
(mirroring their docx/odt/pdf ones). Math renders as _native Typst equations_
(real text, converted from LaTeX with `tex2typst`) and diagrams as embedded
_vector SVG_ (labels as SVG text in the document's font, crisp at any zoom) —
both carrying alt text, as PDF/UA requires:

```ts
import { diagramBlockMapping } from "@blocknote/diagram-block/typst-exporter";
import {
  inlineMathMapping,
  mathBlockMapping,
} from "@blocknote/math-block/typst-exporter";

new TypstExporter(schema, {
  ...typstDefaultSchemaMappings,
  blockMapping: {
    ...typstDefaultSchemaMappings.blockMapping,
    mathBlock: mathBlockMapping,
    diagram: diagramBlockMapping,
  },
  inlineContentMapping: {
    ...typstDefaultSchemaMappings.inlineContentMapping,
    math: inlineMathMapping,
  },
});
```

Known limitation: the LaTeX-to-Typst translation (`tex2typst`) does not cover
every valid KaTeX command — an untranslatable command (e.g. `\coloneqq`,
`\xrightarrow{f}`, `\stackrel`, `\phantom`) passes the mapping's KaTeX
validation but fails the Typst compile with an "unknown variable" error,
failing the export. This is deliberate: only _invalid_ input degrades to a
placeholder; a valid formula the pipeline cannot render must fail loudly
rather than silently export something else.

Alternatives measured (32-command KaTeX corpus, output compiled standalone):
`tex2typst` 28/32; `mitex-wasm` 14/32 — mitex's output presumes its Typst
package's prelude of shim definitions (even `pmatrix`/`cases`/`\text` fail
without it), so using it at mapping time means shipping and version-pinning
that prelude into every document, and using it as a Typst package means
registry access plus a wasm-in-wasm plugin runtime in the browser compiler.
`tylax` is a Rust CLI/library (no npm artifact) aimed at whole-document
conversion. `tex2typst` is also the most recently maintained of the three.

### CJK / additional scripts

Like the react-pdf exporter's `fonts` + `fontFamily` options: load the extra
font's bytes via the compile options' `fonts`, and declare the fallback list on
the exporter — `fontFamily: ["Inter 18pt", "Noto Sans SC"]`.

### Error handling

Following the repo's error conventions (AGENTS.md): failures in _user input_
(LaTeX or Mermaid source that doesn't parse) render the editor-style grey
placeholder; _environment_ failures fail the export loudly — an image URL that
can't be resolved rejects `toTypst`, and a Typst compile error rejects
`blocksToPdfUA` — rather than silently degrading the document.

The wasm compiler is a page-level singleton: its wasm module and fonts load on
the first compile, later compiles reuse them, and a call that tries to change
them throws. Pass every font the page will need on the first
`compileTypstToTaggedPdf`/`blocksToPdfUA` call, reusing the same byte arrays
across calls. Concurrent compiles are serialized internally.

## PDF/UA notes

- **Alt text:** every figure must have non-empty alt text. BlockNote's image
  block has no dedicated `alt` field yet, so caption/name is used as a fallback
  ([#2853](https://github.com/TypeCellOS/BlockNote/issues/2853)).
- **Emoji:** the browser has no OS font access — supply an emoji font or emoji
  render as `.notdef` and fail UA-1
  ([#1978](https://github.com/TypeCellOS/BlockNote/issues/1978)).
- **`declarePdfUA` declares, it does not create conformance.** Always run
  `verapdf --flavour ua1` as a gate.

## Tests

- `src/typst/typstExporter.test.ts` — exporter → Typst (snapshot is the golden `.typ`)
- `src/pdfua/postProcess.test.ts` — the UA-1 declaration, unit-tested
- `src/pdfua/golden.test.ts` — full pipeline (exporter → tagged PDF → declare),
  with a `veraPDF --flavour ua1` conformance gate when veraPDF is installed
  (skipped otherwise, so it's CI-portable)

## Status / follow-ups

Done: real image embedding (`resolveFile` → shadow files), table header rows →
`TH`, multi-column layout (as an untagged grid), code syntax highlighting
(Typst-native via `raw(lang:)`), math & diagram mappings (see above), CJK via
`fontFamily` fallback lists.

- [ ] `alt` field on image/file/video blocks
      ([#2853](https://github.com/TypeCellOS/BlockNote/issues/2853)) — until
      then caption/name is the alt fallback
- [ ] Heading-hierarchy conformance: PDF/UA-1 requires the document's first
      heading to be level 1 (Typst's own `ua-1` validation enforces it). A
      BlockNote document starting at H2 still compiles through the browser
      pipeline but the declared PDF is non-conformant — either normalize
      heading levels on export or surface it to the caller
- [ ] Bundle/standardize default + emoji fonts for turnkey browser use
- [ ] Native `--pdf-standard ua-1` once the _web_ compiler exposes it (the node
      compiler already does — `pdfStandard: "ua-1"` — which would make
      `declarePdfUA` unnecessary server-side)
