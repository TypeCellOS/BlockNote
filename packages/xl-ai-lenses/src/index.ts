// The entry point `@blocknote/xl-ai-lenses`: the document agent in an
// editor (the extension, the menu, the review), and all code of
// `@blocknote/xl-ai-lenses/server`.
//
// The document agent uses three parts of `@blocknote/xl-ai`, through its
// public entry points: the text lens (`@blocknote/xl-ai/text-lens`), and
// `AIExtension` and the AI menu for the editor side.
import "./style.css";

export * from "./client/index.js";
export * from "./server.js";
