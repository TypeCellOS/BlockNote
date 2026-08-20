import { Schema } from "prosemirror-model";
import { EditorState, PluginKey } from "prosemirror-state";
import { Decoration } from "prosemirror-view";
import { createHighlightPlugin } from "prosemirror-highlight";
import { describe, expect, it } from "vite-plus/test";

/**
 * @vitest-environment jsdom
 */

// Regression coverage for inline syntax highlighting. `prosemirror-highlight`
// used to collect only text-block nodes, so inline nodes (e.g. inline math)
// were never highlighted. Since v0.15.3 it collects nodes by
// `node.inlineContent` (https://github.com/ocavue/prosemirror-highlight/pull/137),
// so inline content with a `meta.highlight` is highlighted too. This suite
// guards that behavior. It drives the plugin directly against a hand-built
// ProseMirror doc, so it needs neither Shiki nor a browser.
describe("inline syntax highlighting", () => {
  // A minimal schema with an *inline* node type that holds inline content
  // (`content: "text*"`), mirroring how inline content like inline math is
  // structured, plus an *atom* inline node that holds no content.
  const schema = new Schema({
    nodes: {
      text: { group: "inline" },
      inlineCode: {
        group: "inline",
        inline: true,
        content: "text*",
        toDOM: () => ["span", 0],
      },
      // An atom inline node (no inline content) - like a mention. It should
      // never be collected for highlighting even if named in `nodeTypes`, since
      // it holds no editable text. This is why the library keys off
      // `node.inlineContent` rather than merely `node.isInline`.
      mention: {
        group: "inline",
        inline: true,
        atom: true,
        toDOM: () => ["span", "@x"],
      },
      paragraph: {
        group: "block",
        content: "inline*",
        toDOM: () => ["p", 0],
      },
      doc: { content: "block+" },
    },
  });

  const docWithInline = schema.node("doc", null, [
    schema.node("paragraph", null, [
      schema.text("before "),
      schema.node("inlineCode", null, [schema.text("const x = 1")]),
      schema.text(" "),
      schema.node("mention"),
      schema.text(" after"),
    ]),
  ]);

  it("calls the parser with the inline node's content and decorates it", () => {
    const seen: { content: string; language?: string }[] = [];

    const plugin = createHighlightPlugin({
      // Synchronous stub parser mirroring how the real Shiki parser emits token
      // decorations: `Decoration.inline` over positions *inside* the node,
      // starting at `pos + 1` (the node's content starts after its opening
      // boundary). Node-spanning decorations aren't valid over an inline node,
      // which is fine - the token decorations are what actually color the text.
      parser: ({ content, language, pos }) => {
        seen.push({ content, language });
        return [
          Decoration.inline(pos + 1, pos + 1 + content.length, {
            class: "hl",
          }),
        ];
      },
      nodeTypes: ["inlineCode"],
      languageExtractor: () => "javascript",
    });

    const state = EditorState.create({
      schema,
      doc: docWithInline,
      plugins: [plugin],
    });

    const key = (plugin as any).spec.key as PluginKey;
    const pluginState = key.getState(state);

    // The inline node's text reached the parser - proving inline nodes are
    // collected (with the pre-0.15.3 library, `seen` would be empty).
    expect(seen).toHaveLength(1);
    expect(seen[0].content).toBe("const x = 1");
    expect(seen[0].language).toBe("javascript");

    // And a decoration was produced for it.
    expect(pluginState.decorations).toBeDefined();
    expect(pluginState.decorations.find().length).toBeGreaterThan(0);
  });

  it("still leaves non-matching inline nodes untouched", () => {
    const seen: string[] = [];
    const plugin = createHighlightPlugin({
      parser: ({ content }) => {
        seen.push(content);
        return [];
      },
      nodeTypes: ["somethingElse"],
      languageExtractor: () => "javascript",
    });

    EditorState.create({ schema, doc: docWithInline, plugins: [plugin] });

    expect(seen).toHaveLength(0);
  });

  it("excludes atom inline nodes even when named in `nodeTypes`", () => {
    const seen: string[] = [];
    const plugin = createHighlightPlugin({
      parser: ({ content }) => {
        seen.push(content);
        return [];
      },
      // `mention` is an atom inline node with no inline content, so it holds no
      // text to highlight. The library keys off `node.inlineContent`, not
      // `node.isInline`, so it's correctly skipped.
      nodeTypes: ["mention"],
      languageExtractor: () => "javascript",
    });

    EditorState.create({ schema, doc: docWithInline, plugins: [plugin] });

    expect(seen).toHaveLength(0);
  });
});
