// The Typst compiler wasm for the docs build (see next.config.ts): the
// pdf-ua example bundles it via Vite's `?url`; under the docs site the
// import is aliased here. `new URL(..., import.meta.url)` is Turbopack's
// static-asset reference: the ~25MB wasm is emitted as a hashed static
// file and served by the site itself - no CDN involved, and the version
// can't skew from the installed package because it IS the installed file.
const url = new URL(
  "../node_modules/@blocknote/xl-typst-compiler/pkg/blocknote_typst_wasm_bg.wasm",
  import.meta.url,
).href;
export default url;
