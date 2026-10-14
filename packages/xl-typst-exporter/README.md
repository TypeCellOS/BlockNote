# @blocknote/xl-typst-exporter

Exports BlockNote documents to [Typst](https://typst.app) markup. This is the
shared foundation of `@blocknote/xl-pdf-exporter` (which compiles the markup
to accessible, tagged PDF/UA-1) — the same mappings serve both targets, so a
custom block needs only one Typst mapping to support `.typ` export _and_ PDF
export.

## Usage

```ts
import {
  TypstExporter,
  typstDefaultSchemaMappings,
} from "@blocknote/xl-typst-exporter";

const exporter = new TypstExporter(editor.schema, typstDefaultSchemaMappings);
const typst = await exporter.toTypst(editor.document, {
  title: "My document",
  lang: "en",
});
// Compile with your own toolchain (typst CLI, @myriaddreamin/typst-ts-node-compiler, ...)
// mapping `exporter.assetFiles` into the compiler's filesystem first —
// or use @blocknote/xl-pdf-exporter for the batteries-included browser pipeline.
```

Custom-mapping helpers (`strLit`, `errorPlaceholder`) are exported for
packages that ship their own Typst mappings — see
`@blocknote/math-block/typst-exporter` and
`@blocknote/diagram-block/typst-exporter`.

Note on exporter lifetime: an exporter instance's asset registry is
append-only, so when repeatedly exporting changing content, create a fresh
exporter per export (construction is cheap).
