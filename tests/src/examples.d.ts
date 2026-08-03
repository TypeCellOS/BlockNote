// e2e tests mount example apps via `import App from "@examples/<group>/<name>/src/App"`.
// The `@examples` alias is resolved by Vite at runtime (see vite.config.browser.ts).
// We declare it ambiently as a React component so `tsc` resolves the import to a
// type WITHOUT descending into the example sources (which live outside the tests
// rootDir and would otherwise break the composite build with TS6059). A tsconfig
// `paths` entry would do the opposite — resolve to the real files — so we use this
// ambient module instead.
declare module "@examples/*" {
  import type { ComponentType } from "react";
  const App: ComponentType;
  export default App;
}

// The y-prosemirror suggestion tests share their scenario definitions (the
// `initial` seed + the `apply` change) with the suggestion-gallery example, so
// the two never drift. A specific declaration (more specific than the
// `@examples/*` wildcard above) gives the named exports real types without a
// `paths` entry descending into the example sources (which would break the
// composite build, TS6059 — see the note above).
declare module "@examples/07-collaboration/14-suggestion-gallery/src/scenarios" {
  import type { BlockNoteEditor, PartialBlock } from "@blocknote/core";
  export type SingleScenario = {
    kind: "single";
    id: string;
    title: string;
    category: string;
    description: string;
    initial: PartialBlock[];
    apply: (editor: BlockNoteEditor) => void;
    knownCrash?: boolean;
  };
  export type ConcurrentScenario = {
    kind: "concurrent";
    id: string;
    title: string;
    category: string;
    description: string;
    initial: PartialBlock[];
    applyA: (editor: BlockNoteEditor) => void;
    applyB: (editor: BlockNoteEditor) => void;
    knownCrash?: boolean;
  };
  export type SuggestionScenario = SingleScenario | ConcurrentScenario;
  export const scenarios: SuggestionScenario[];
  // Exported image data URLs so prop-change tests poll the same value a
  // scenario sets (see scenarios.ts).
  export const IMG_SRC_BASE: string;
  export const IMG_SRC_NEW: string;
}

// The suggestion-gallery editor schema (default blocks + page break + multi-column),
// shared with the fixtures so the test editors match the gallery. Declared loosely
// (like the scenarios above) so the composite build never descends into the example
// sources (TS6059 — see the note at the top).
declare module "@examples/07-collaboration/14-suggestion-gallery/src/gallerySchema" {
  import type { BlockNoteEditor, PartialBlock } from "@blocknote/core";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const gallerySchema: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export type GalleryEditor = BlockNoteEditor<any, any, any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export type GalleryPartialBlock = PartialBlock<any, any, any>;
}

// The formula editor example (04-converting-blocks-from-md) exposes a few
// pure functions that the formula e2e test unit-tests directly, alongside
// mounting `App`. Declared specifically (more specific than the `@examples/*`
// wildcard above) so these named exports have real types without a `paths`
// entry descending into the example sources (TS6059 — see the note at top).
declare module "@examples/05-interoperability/04-converting-blocks-from-md/src/markdown/preprocessMarkdown" {
  export type PreprocessResult = {
    processed: string;
    inlineMap: Map<string, string>;
    blockMap: Map<string, string>;
  };
  export function preprocessMarkdown(md: string): PreprocessResult;
}
declare module "@examples/05-interoperability/04-converting-blocks-from-md/src/markdown/postprocessBlocks" {
  export function postprocessBlocks<
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    B = any,
  >(
    blocks: B[],
    inlineMap: Map<string, string>,
    blockMap: Map<string, string>,
  ): B[];
}
declare module "@examples/05-interoperability/04-converting-blocks-from-md/src/formula/katexRenderer" {
  export type RenderResult = { html: string; error: string | null };
  export function renderLatex(
    latex: string,
    options?: { displayMode?: boolean },
  ): RenderResult;
}
