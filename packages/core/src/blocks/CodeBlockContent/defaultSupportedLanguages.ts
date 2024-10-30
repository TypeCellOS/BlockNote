import { bundledLanguagesInfo } from "shiki/bundle/web";

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
      return ![
        "angular-html",
        "angular-ts",
        "astro",
        "blade",
        "coffee",
        "handlebars",
        "html-derivative",
        "http",
        "imba",
        "jinja",
        "jison",
        "json5",
        "marko",
        "mdc",
        "stylus",
        "ts-tags",
      ].includes(lang.id);
    })
    .map((lang) => ({
      match: [lang.id, ...(lang.aliases || [])],
      id: lang.id,
      name: lang.name,
    })),
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
