// The Typst compiler wasm for the docs build (see next.config.ts): the
// pdf-ua example bundles it via Vite's `?url`; under the docs site the
// import is aliased here, resolving to the same version from the CDN (the
// docs are online by definition, and inlining the ~29MB wasm is not). The
// version comes from the installed package so the two can't skew.
import pkg from "@myriaddreamin/typst-ts-web-compiler/package.json";

const url = `https://cdn.jsdelivr.net/npm/@myriaddreamin/typst-ts-web-compiler@${pkg.version}/pkg/typst_ts_web_compiler_bg.wasm`;
export default url;
