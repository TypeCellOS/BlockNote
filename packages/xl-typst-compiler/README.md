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

The build task checks the Rust sources, pinned toolchain, resolved wasm-pack
version, and build scripts using one content hash shared with CI. Before the
TypeScript build, it tries these paths in order:

1. Reuse matching `pkg/` files after verifying their checksums.
2. Restore matching files from the per-user cache (shared across worktrees).
3. Download an exact-hash artifact from a successful `main` push of the
   repository's build workflow. PR artifacts are never accepted.
4. Compile from source with rustup (the pinned toolchain and wasm32 target
   auto-install). CI/Vercel bootstrap rustup if needed; local machines need
   rustup installed. Vercel keeps Rust caches under `node_modules/.cache`.

Developer downloads require `gh auth login`, `GH_TOKEN`, or `GITHUB_TOKEN`
with read access to Actions artifacts. No interactive authentication happens
during builds. Missing credentials, offline requests, expired artifacts, and
invalid downloads fall back to source compilation; downloads time out after
30 seconds and require `unzip`. Artifacts are retained for 90 days, and a new
fingerprint only becomes downloadable after a successful `main` build.

The cache lives at `$XDG_CACHE_HOME/blocknote/typst-wasm-v2` (default
`~/.cache/blocknote/typst-wasm-v2`). Override it with
`BLOCKNOTE_TYPST_CACHE_DIR`. Entries are content-addressed and can be removed
when no builds are running to reclaim disk space; there is no automatic eviction.
Set `BLOCKNOTE_TYPST_DOWNLOAD=0` to disable remote downloads while keeping local
reuse. `vp run --filter @blocknote/xl-typst-compiler build:wasm` bypasses all
caches and forces source compilation. `BLOCKNOTE_TYPST_SOURCE_ONLY=1` also
bypasses all WASM reuse; release builds use this with task caching disabled.

Downloads are staged and checksum-verified before installation. The checksums
detect corruption; trust comes from the restricted workflow producer, not the
source hash alone. Simultaneous builds in one checkout are serialized. If a
process is forcibly killed, remove `node_modules/.typst-wasm.lock` inside this
package after confirming no build is still running.

`pkg/` is a build output (not checked in); the published npm package
includes it.

## Loading the wasm

By default the module loads from this package's own files, relative to the
wasm-bindgen glue - no CDN involved; bundlers (Vite, webpack) emit it as an
asset automatically. To control loading (self-hosting, caching, Node), pass
`wasm` to `TypstCompiler.create` - a URL or the module bytes. The module is
loaded once; later `create()` calls reuse it.
