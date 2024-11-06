import { bundledLanguagesInfo } from "shiki";

export type SupportedLanguageConfig = {
  id: string;
  name: string;
  match: string[];
};

export const defaultSupportedLanguages: SupportedLanguageConfig[] = [
  {
    id: "text",
    name: "Plain Text",
    match: ["text", "txt", "plain"],
  },
  ...bundledLanguagesInfo
    .filter((lang) => {
      return [
        "c",
        "cpp",
        "css",
        "glsl",
        "graphql",
        "haml",
        "html",
        "java",
        "javascript",
        "json",
        "jsonc",
        "jsonl",
        "jsx",
        "julia",
        "less",
        "markdown",
        "mdx",
        "php",
        "postcss",
        "pug",
        "python",
        "r",
        "regexp",
        "sass",
        "scss",
        "shellscript",
        "sql",
        "svelte",
        "typescript",
        "vue",
        "vue-html",
        "wasm",
        "wgsl",
        "xml",
        "yaml",
      ].includes(lang.id);
    })
    .map((lang) => ({
      match: [lang.id, ...(lang.aliases || [])],
      id: lang.id,
      name: lang.name,
    })),
  { id: "tsx", name: "TSX", match: ["tsx", "typescriptreact"] },
  {
    id: "haskell",
    name: "Haskell",
    match: ["haskell", "hs"],
  },
  {
    id: "csharp",
    name: "C#",
    match: ["c#", "csharp", "cs"],
  },
  {
    id: "latex",
    name: "LaTeX",
    match: ["latex"],
  },
  {
    id: "lua",
    name: "Lua",
    match: ["lua"],
  },
  {
    id: "mermaid",
    name: "Mermaid",
    match: ["mermaid", "mmd"],
  },
  {
    id: "ruby",
    name: "Ruby",
    match: ["ruby", "rb"],
  },
  {
    id: "rust",
    name: "Rust",
    match: ["rust", "rs"],
  },
  {
    id: "scala",
    name: "Scala",
    match: ["scala"],
  },
  {
    id: "swift",
    name: "Swift",
    match: ["swift"],
  },
  {
    id: "kotlin",
    name: "Kotlin",
    match: ["kotlin", "kt", "kts"],
  },
  {
    id: "objective-c",
    name: "Objective C",
    match: ["objective-c", "objc"],
  },
];
