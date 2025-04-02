/* Generate by @shikijs/codegen */
import type {
  DynamicImportLanguageRegistration,
  DynamicImportThemeRegistration,
  HighlighterGeneric,
} from "@shikijs/types";
import { createdBundledHighlighter } from "@shikijs/core";
import { createJavaScriptRegexEngine } from "@shikijs/engine-javascript";

type BundledLanguage = "typescript" | "ts" | "javascript" | "js" | "vue";
type BundledTheme = "github-light" | "github-dark";
type Highlighter = HighlighterGeneric<BundledLanguage, BundledTheme>;

const bundledLanguages = {
  c: () => import("@shikijs/langs-precompiled/c"),
  cpp: () => import("@shikijs/langs-precompiled/cpp"),
  "c++": () => import("@shikijs/langs-precompiled/cpp"),
  css: () => import("@shikijs/langs-precompiled/css"),
  glsl: () => import("@shikijs/langs-precompiled/glsl"),
  graphql: () => import("@shikijs/langs-precompiled/graphql"),
  gql: () => import("@shikijs/langs-precompiled/graphql"),
  haml: () => import("@shikijs/langs-precompiled/haml"),
  html: () => import("@shikijs/langs-precompiled/html"),
  java: () => import("@shikijs/langs-precompiled/java"),
  javascript: () => import("@shikijs/langs-precompiled/javascript"),
  js: () => import("@shikijs/langs-precompiled/javascript"),
  json: () => import("@shikijs/langs-precompiled/json"),
  jsonc: () => import("@shikijs/langs-precompiled/jsonc"),
  jsonl: () => import("@shikijs/langs-precompiled/jsonl"),
  jsx: () => import("@shikijs/langs-precompiled/jsx"),
  julia: () => import("@shikijs/langs-precompiled/julia"),
  jl: () => import("@shikijs/langs-precompiled/julia"),
  less: () => import("@shikijs/langs-precompiled/less"),
  markdown: () => import("@shikijs/langs-precompiled/markdown"),
  md: () => import("@shikijs/langs-precompiled/markdown"),
  mdx: () => import("@shikijs/langs-precompiled/mdx"),
  php: () => import("@shikijs/langs-precompiled/php"),
  postcss: () => import("@shikijs/langs-precompiled/postcss"),
  pug: () => import("@shikijs/langs-precompiled/pug"),
  jade: () => import("@shikijs/langs-precompiled/pug"),
  python: () => import("@shikijs/langs-precompiled/python"),
  py: () => import("@shikijs/langs-precompiled/python"),
  r: () => import("@shikijs/langs-precompiled/r"),
  regexp: () => import("@shikijs/langs-precompiled/regexp"),
  regex: () => import("@shikijs/langs-precompiled/regexp"),
  sass: () => import("@shikijs/langs-precompiled/sass"),
  scss: () => import("@shikijs/langs-precompiled/scss"),
  shellscript: () => import("@shikijs/langs-precompiled/shellscript"),
  bash: () => import("@shikijs/langs-precompiled/shellscript"),
  sh: () => import("@shikijs/langs-precompiled/shellscript"),
  shell: () => import("@shikijs/langs-precompiled/shellscript"),
  zsh: () => import("@shikijs/langs-precompiled/shellscript"),
  sql: () => import("@shikijs/langs-precompiled/sql"),
  svelte: () => import("@shikijs/langs-precompiled/svelte"),
  typescript: () => import("@shikijs/langs-precompiled/typescript"),
  ts: () => import("@shikijs/langs-precompiled/typescript"),
  vue: () => import("@shikijs/langs-precompiled/vue"),
  "vue-html": () => import("@shikijs/langs-precompiled/vue-html"),
  wasm: () => import("@shikijs/langs-precompiled/wasm"),
  wgsl: () => import("@shikijs/langs-precompiled/wgsl"),
  xml: () => import("@shikijs/langs-precompiled/xml"),
  yaml: () => import("@shikijs/langs-precompiled/yaml"),
  yml: () => import("@shikijs/langs-precompiled/yaml"),
  tsx: () => import("@shikijs/langs-precompiled/tsx"),
  typescriptreact: () => import("@shikijs/langs-precompiled/tsx"),
  haskell: () => import("@shikijs/langs-precompiled/haskell"),
  hs: () => import("@shikijs/langs-precompiled/haskell"),
  "c#": () => import("@shikijs/langs-precompiled/csharp"),
  csharp: () => import("@shikijs/langs-precompiled/csharp"),
  cs: () => import("@shikijs/langs-precompiled/csharp"),
  latex: () => import("@shikijs/langs-precompiled/latex"),
  lua: () => import("@shikijs/langs-precompiled/lua"),
  mermaid: () => import("@shikijs/langs-precompiled/mermaid"),
  mmd: () => import("@shikijs/langs-precompiled/mermaid"),
  ruby: () => import("@shikijs/langs-precompiled/ruby"),
  rb: () => import("@shikijs/langs-precompiled/ruby"),
  rust: () => import("@shikijs/langs-precompiled/rust"),
  rs: () => import("@shikijs/langs-precompiled/rust"),
  scala: () => import("@shikijs/langs-precompiled/scala"),
  // Swift does not support pre-compilation right now
  swift: () => import("@shikijs/langs/swift"),
  kotlin: () => import("@shikijs/langs-precompiled/kotlin"),
  kt: () => import("@shikijs/langs-precompiled/kotlin"),
  kts: () => import("@shikijs/langs-precompiled/kotlin"),
  "objective-c": () => import("@shikijs/langs-precompiled/objective-c"),
  objc: () => import("@shikijs/langs-precompiled/objective-c"),
} as Record<BundledLanguage, DynamicImportLanguageRegistration>;

const bundledThemes = {
  "github-dark": () => import("@shikijs/themes/github-dark"),
  "github-light": () => import("@shikijs/themes/github-light"),
} as Record<BundledTheme, DynamicImportThemeRegistration>;

const createHighlighter = /* @__PURE__ */ createdBundledHighlighter<
  BundledLanguage,
  BundledTheme
>({
  langs: bundledLanguages,
  themes: bundledThemes,
  engine: () => createJavaScriptRegexEngine(),
});

export { createHighlighter };
export type { BundledLanguage, BundledTheme, Highlighter };
