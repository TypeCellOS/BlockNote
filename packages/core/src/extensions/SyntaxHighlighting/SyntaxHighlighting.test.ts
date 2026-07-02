import { describe, expect, it } from "vite-plus/test";
import { SyntaxHighlightingExtension } from "./SyntaxHighlighting.js";

/**
 * @vitest-environment jsdom
 */

describe("SyntaxHighlightingExtension", () => {
  // The extension only reads `editor.schema.blockSpecs`, so a minimal stub is
  // enough.
  const fakeEditor = () =>
    ({
      schema: {
        blockSpecs: {
          paragraph: { config: { type: "paragraph", content: "inline" } },
          codeBlock: { config: { type: "codeBlock", content: "inline" } },
          image: { config: { type: "image", content: "none" } },
        },
      },
    }) as any;

  const pluginsFor = (options: any) =>
    SyntaxHighlightingExtension(options)({ editor: fakeEditor() })
      .prosemirrorPlugins;

  // Whether highlighting is enabled at all is decided by the editor (it only
  // instantiates this extension when the `syntaxHighlighting` option is set), so
  // the extension itself always installs the plugin once created.
  it("installs a highlight plugin when a highlighter is configured", () => {
    const plugins = pluginsFor({ createHighlighter: async () => ({}) as any });

    expect(plugins).toHaveLength(1);
  });

  it("installs the plugin even without a highlighter (it no-ops at parse time)", () => {
    expect(pluginsFor({})).toHaveLength(1);
  });
});
