import { describe, expect, vi } from "vite-plus/test";
import {
  collectHighlightNodeTypes,
  SyntaxHighlightingExtension,
} from "./SyntaxHighlighting.js";

describe("SyntaxHighlightingExtension", () => {
  // Whether highlighting is enabled at all is decided by the user (they choose
  // to add this extension to the editor's `extensions`), so the extension
  // itself always installs the plugin once created.
  it("installs a highlight plugin when a highlighter is configured", async ({
    setupEditor,
  }) => {
    const createHighlighter = vi.fn(async () => {
      throw new Error(
        "Installing the plugin should not invoke the highlighter",
      );
    });
    const extension = SyntaxHighlightingExtension({ createHighlighter });
    const { editor } = await setupEditor({ extensions: [extension] });

    expect(
      editor.getExtension(SyntaxHighlightingExtension)?.prosemirrorPlugins,
    ).toHaveLength(1);
    expect(createHighlighter).not.toHaveBeenCalled();
  });

  it("installs the plugin even without a highlighter (it no-ops at parse time)", async ({
    setupEditor,
  }) => {
    // @ts-expect-error Unconfigured JavaScript consumers may omit the highlighter.
    const extension = SyntaxHighlightingExtension({});
    const { editor } = await setupEditor({ extensions: [extension] });

    expect(
      editor.getExtension(SyntaxHighlightingExtension)?.prosemirrorPlugins,
    ).toHaveLength(1);
  });
});

describe("collectHighlightNodeTypes", () => {
  const highlight = () => "latex";

  it("includes blocks with `content: plain` and a `meta.highlight`", () => {
    const types = collectHighlightNodeTypes({
      blockSpecs: {
        // Highlightable: plain content + a highlight callback.
        mathBlock: {
          config: { type: "mathBlock", content: "plain" },
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

    expect(types).toEqual(["mathBlock"]);
  });

  it("includes inline content with `content: plain` and a `meta.highlight`", () => {
    const types = collectHighlightNodeTypes({
      blockSpecs: {},
      inlineContentSpecs: {
        // Highlightable: plain (editable plain text) + a highlight callback.
        math: {
          config: { type: "math", content: "plain" },
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

    expect(types).toEqual(["math"]);
  });

  it("collects both block and inline-content highlight types together", () => {
    const types = collectHighlightNodeTypes({
      blockSpecs: {
        mathBlock: {
          config: { type: "mathBlock", content: "plain" },
          implementation: { meta: { highlight } },
        },
      },
      inlineContentSpecs: {
        math: {
          config: { type: "math", content: "plain" },
          implementation: { meta: { highlight } },
        },
      },
    });

    expect(types).toContain("mathBlock");
    expect(types).toContain("math");
    expect(types).toHaveLength(2);
  });
});
