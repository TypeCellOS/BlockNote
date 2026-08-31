# @blocknote/xl-typst-compiler

The [Typst](https://typst.app) compiler - the official `typst` Rust crates,
compiled to WebAssembly - behind a minimal TypeScript API: Typst markup +
assets + fonts in, PDF bytes (or typed diagnostics) out. This is the engine
of BlockNote's [PDF export](https://www.blocknotejs.org/docs/features/export/pdf);
it also works standalone, in browsers and Node alike.

Design points:

- **No network access, ever.** The wasm embeds no fonts and downloads
  nothing; text renders only with fonts you supply (`fonts` /
  `addFont`), and a document needing a missing font fails loudly instead
  of rendering substituted glyphs.
- **No singleton.** Create as many compiler instances as you like; each
  owns only its font set. The wasm module loads once per page.
- **Native PDF standards.** `pdfStandard: "ua-1"` produces a _validated_,
  declared, accessible PDF/UA-1 - typst checks conformance at compile time
  (heading structure, alt text, document title, ...) and nonconforming
  documents fail with recognizable diagnostics
  (`isPdfStandardViolation`), never with a false conformance claim.
- **Failures are values.** `compilePdf` returns a result union; compile
  errors (including standard violations) carry structured diagnostics with
  messages, hints, and source byte ranges.

```ts
import { TypstCompiler } from "@blocknote/xl-typst-compiler";

const compiler = await TypstCompiler.create({ fonts: [interBytes] });
const result = compiler.compilePdf(source, {
  assets: new Map([["/assets/img.png", pngBytes]]),
  pdfStandard: "ua-1",
});
if (result.error) {
  console.log(result.diagnostics);
} else {
  download(result.pdf);
}
```

## Building the wasm

The wasm module (`pkg/`) is built from `rust/` (toolchain pinned in
`rust/rust-toolchain.toml`, `wasm32-unknown-unknown` target,
[wasm-pack](https://rustwasm.github.io/wasm-pack/)):

```bash
pnpm exec vp run --filter @blocknote/xl-typst-compiler build
```

The build task self-provisions: `scripts/ensure-wasm.mjs` compiles `pkg/`
from `rust/` when it is missing or stale (content-hashed), before the
TypeScript build. It needs rustup locally (the pinned toolchain and wasm32
target auto-install); on Vercel it bootstraps rustup itself and keeps the
cargo caches under `node_modules/.cache`, so only the first build on a
fresh cache pays the full compile. `npm run build:wasm` forces a rebuild.
`pkg/` is a build output (not checked in); the published npm package
includes it.

## Loading the wasm

By default the module loads from this package's own files, relative to the
wasm-bindgen glue - no CDN involved; bundlers (Vite, webpack) emit it as an
asset automatically. To control loading (self-hosting, caching, Node), pass
`wasm` to `TypstCompiler.create` - a URL or the module bytes. The module is
loaded once; later `create()` calls reuse it.
