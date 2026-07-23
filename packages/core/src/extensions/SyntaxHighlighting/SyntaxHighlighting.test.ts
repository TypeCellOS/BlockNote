import { describe, expect, it } from "vite-plus/test";
import {
  collectHighlightNodeTypes,
  SyntaxHighlightingExtension,
} from "./SyntaxHighlighting.js";

/**
 * @vitest-environment jsdom
 */

describe("SyntaxHighlightingExtension", () => {
  // The extension only reads `editor.schema.blockSpecs` and
  // `inlineContentSpecs`, so a minimal stub is enough.
  const fakeEditor = () =>
    ({
      schema: {
        blockSpecs: {
          paragraph: { config: { type: "paragraph", content: "inline" } },
          codeBlock: { config: { type: "codeBlock", content: "plain" } },
          image: { config: { type: "image", content: "none" } },
        },
        inlineContentSpecs: {},
      },
    }) as any;

  const pluginsFor = (options: any) =>
    SyntaxHighlightingExtension(options)({ editor: fakeEditor() })
      .prosemirrorPlugins;

  // Whether highlighting is enabled at all is decided by the user (they choose
  // to add this extension to the editor's `extensions`), so the extension
  // itself always installs the plugin once created.
  it("installs a highlight plugin when a highlighter is configured", () => {
    const plugins = pluginsFor({ createHighlighter: async () => ({}) as any });

    expect(plugins).toHaveLength(1);
  });

  it("installs the plugin even without a highlighter (it no-ops at parse time)", () => {
    expect(pluginsFor({})).toHaveLength(1);
  });
});

describe("collectHighlightNodeTypes", () => {
  const highlight = () => "latex";

  it("includes blocks with `content: plain` and a `meta.highlight`", () => {
    const types = collectHighlightNodeTypes({
      blockSpecs: {
        // Highlightable: plain content + a highlight callback.
        math: {
          config: { type: "math", content: "plain" },
          implementation: { meta: { highlight } },
        },
        // Not highlightable: no highlight callback.
        paragraph: {
          config: { type: "paragraph", content: "inline" },
          implementation: { meta: {} },
        },
        // Not highlightable: `content: none` holds no editable text.
        image: {
          config: { type: "image", content: "none" },
          implementation: { meta: { highlight } },
        },
      },
      inlineContentSpecs: {},
    });

    expect(types).toEqual(["math"]);
  });

  it("includes inline content with `content: plain` and a `meta.highlight`", () => {
    const types = collectHighlightNodeTypes({
      blockSpecs: {},
      inlineContentSpecs: {
        // Highlightable: plain (editable plain text) + a highlight callback.
        inlineMath: {
          config: { type: "inlineMath", content: "plain" },
          implementation: { meta: { highlight } },
        },
        // Not highlightable: no highlight callback.
        mention: {
          config: { type: "mention", content: "plain" },
          implementation: { meta: {} },
        },
        // Not highlightable: `content: none` holds no editable text.
        tag: {
          config: { type: "tag", content: "none" },
          implementation: { meta: { highlight } },
        },
        // Built-in `text`/`link` specs have string configs, not objects.
        text: { config: "text", implementation: undefined },
        link: { config: "link", implementation: undefined },
      },
    });

    expect(types).toEqual(["inlineMath"]);
  });

  it("collects both block and inline-content highlight types together", () => {
    const types = collectHighlightNodeTypes({
      blockSpecs: {
        math: {
          config: { type: "math", content: "plain" },
          implementation: { meta: { highlight } },
        },
      },
      inlineContentSpecs: {
        inlineMath: {
          config: { type: "inlineMath", content: "plain" },
          implementation: { meta: { highlight } },
        },
      },
    });

    expect(types).toContain("math");
    expect(types).toContain("inlineMath");
    expect(types).toHaveLength(2);
  });
});
