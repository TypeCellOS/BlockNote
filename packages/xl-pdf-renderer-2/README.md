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
   │  declarePdfUA()                 (pdf-lib; adds the UA-1 declaration)
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

- [ ] Real image embedding (currently placeholder figures; wire `resolveFile` +
      `image(bytes)` / `mapShadow`)
- [ ] `alt` field on image/file/video blocks
- [ ] Table header rows → `TH` (BlockNote doesn't mark headers by default)
- [ ] Multi-column (`@blocknote/xl-multi-column`) blocks
- [ ] Bundle/standardize default + emoji fonts for turnkey browser use
