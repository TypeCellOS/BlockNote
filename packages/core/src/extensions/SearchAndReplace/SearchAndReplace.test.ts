// @vitest-environment node
import { DecorationSet } from "prosemirror-view";
import {
  afterEach,
  describe,
  expect,
  expectTypeOf,
  it,
  vi,
} from "vite-plus/test";

import { BlockNoteSchema } from "../../blocks/BlockNoteSchema.js";
import type { PartialBlock } from "../../blocks/defaultBlocks.js";
import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { createInlineContentSpec } from "../../schema/inlineContent/createSpec.js";
import { BlockChangeExtension } from "../BlockChange/BlockChange.js";
import { HistoryExtension } from "../History/History.js";
import { ReadOnlyExtension } from "../ReadOnly/ReadOnly.js";
import {
  defaultMatcher,
  SearchAndReplaceExtension,
  type SearchAndReplaceMatchChange,
  type SearchAndReplaceMatcher,
} from "./index.js";

const cleanup: (() => void)[] = [];

afterEach(() => {
  for (const dispose of cleanup.splice(0)) {
    dispose();
  }
});

function setup(initialContent: PartialBlock[] = [{ content: "cat cat cat" }]) {
  const editor = BlockNoteEditor.create({
    initialContent,
    extensions: [SearchAndReplaceExtension()],
  });
  installStatePlugins(editor);
  return { editor, search: editor.getExtension(SearchAndReplaceExtension)! };
}

function installStatePlugins(
  editor: Pick<BlockNoteEditor, "getExtension" | "_tiptapEditor">,
) {
  // Mounting normally installs these plugins. Use the real state-only plugins
  // headlessly so history and rejected edits exercise their normal reducers.
  for (const extension of [
    editor.getExtension(HistoryExtension)!,
    editor.getExtension(BlockChangeExtension)!,
    editor.getExtension(SearchAndReplaceExtension)!,
  ]) {
    for (const plugin of extension.prosemirrorPlugins) {
      editor._tiptapEditor.registerPlugin(plugin);
    }
  }
  // Search subscribes to document changes during mount, without needing a DOM.
  cleanup.push(editor.getExtension(SearchAndReplaceExtension)!.mount(), () =>
    editor._tiptapEditor.destroy(),
  );
}

function matchRanges(
  editor: Pick<BlockNoteEditor, "getExtension" | "prosemirrorState">,
) {
  const plugin = editor.getExtension(SearchAndReplaceExtension)!
    .prosemirrorPlugins[0];
  const decorations = plugin.props.decorations?.call(
    plugin,
    editor.prosemirrorState,
  );
  expect(decorations).toBeInstanceOf(DecorationSet);
  return decorations instanceof DecorationSet
    ? decorations.find().map(({ from, to }) => ({ from, to }))
    : [];
}

function matchedText(
  editor: Pick<BlockNoteEditor, "getExtension" | "prosemirrorState">,
) {
  return matchRanges(editor).map(({ from, to }) =>
    editor.prosemirrorState.doc.textBetween(from, to),
  );
}

describe("SearchAndReplaceExtension (headless)", () => {
  it("searches literal text, updates case sensitivity and clears an empty query", () => {
    const { editor, search } = setup([
      { content: "A.*+[x](y)?^$\\ a.*+[x](y)?^$\\ axxy" },
    ]);
    search.setQuery({ searchTerm: "a.*+[x](y)?^$\\" });
    expect(matchedText(editor)).toEqual(["A.*+[x](y)?^$\\", "a.*+[x](y)?^$\\"]);
    search.setQuery({ searchTerm: "a.*+[x](y)?^$\\", caseSensitive: true });
    expect(matchedText(editor)).toEqual(["a.*+[x](y)?^$\\"]);
    search.setQuery({ searchTerm: "a.*+[x](y)?^$\\", caseSensitive: false });
    expect(search.store.state.matches).toHaveLength(2);
    search.setQuery({ searchTerm: "" });
    expect(search.store.state.matches).toEqual([]);
    expect(search.store.state.currentIndex).toBeNull();
    expect(matchRanges(editor)).toEqual([]);
  });

  it("spans formatting but not blocks, table cells or inline atoms", () => {
    const schema = BlockNoteSchema.create().extend({
      inlineContentSpecs: {
        mention: createInlineContentSpec(
          {
            type: "mention",
            content: "none",
            propSchema: { label: { default: "cat" } },
          },
          {
            render() {
              throw new Error("Headless search must not render inline atoms");
            },
          },
        ),
      },
    });
    const editor = BlockNoteEditor.create({
      schema,
      initialContent: [
        {
          content: [
            { type: "text", text: "ca", styles: { bold: true } },
            { type: "text", text: "t", styles: { italic: true } },
          ],
          children: [{ content: "cat" }],
        },
        { content: "ca", children: [{ content: "t" }] },
        { content: "ca" },
        { content: "t" },
        {
          type: "table",
          content: {
            type: "tableContent",
            rows: [{ cells: ["cat", "ca", "t"] }],
          },
        },
        { type: "codeBlock", content: "const cat = 'cat';" },
        {
          content: [
            { type: "text", text: "ca", styles: {} },
            { type: "mention", props: { label: "cat" } },
            { type: "text", text: "t cat", styles: {} },
          ],
        },
      ],
      extensions: [SearchAndReplaceExtension()],
    });
    installStatePlugins(editor);
    const search = editor.getExtension(SearchAndReplaceExtension)!;
    search.setQuery({ searchTerm: "cat" });
    expect(search.store.state.matches).toHaveLength(6);
    expect(matchedText(editor)).toEqual(Array(6).fill("cat"));
  });

  it("wraps navigation and safely navigates an empty result set", () => {
    const { editor, search } = setup();
    search.nextMatch();
    search.previousMatch();
    expect(search.store.state.currentIndex).toBeNull();
    search.setQuery({ searchTerm: "cat" });
    expect(search.store.state.currentIndex).toBe(0);
    search.previousMatch();
    expect(search.store.state.currentIndex).toBe(2);
    search.nextMatch();
    expect(search.store.state.currentIndex).toBe(0);
    search.nextMatch();
    expect(search.store.state.currentIndex).toBe(1);
    const { from } = matchRanges(editor)[0];
    editor.transact((tr) => tr.insertText("a much longer prefix ", from));
    // Edits choose the nearest match at or after the old, unmapped position.
    expect(search.store.state.currentIndex).toBe(0);
    search.replace("dog");
    expect(editor.prosemirrorState.doc.textContent).toBe(
      "a much longer prefix dog cat cat",
    );
  });

  it("deletes the active rather than first match and supports undo", () => {
    const { editor, search } = setup();
    const before = editor.document;
    search.setQuery({ searchTerm: "cat" });
    search.nextMatch();
    search.replace("");
    expect(editor.prosemirrorState.doc.textContent).toBe("cat  cat");
    expect(search.store.state.matches).toHaveLength(2);
    expect(editor.undo()).toBe(true);
    expect(editor.document).toEqual(before);
    expect(search.store.state.matches).toHaveLength(3);
  });

  it("replaces original matches once without damaging structure or merging typing history", () => {
    const { editor, search } = setup([
      {
        id: "p",
        content: [{ type: "text", text: "cat", styles: { bold: true } }],
        children: [{ id: "child", content: "cat" }],
      },
      {
        id: "table",
        type: "table",
        content: { type: "tableContent", rows: [{ cells: ["cat", "safe"] }] },
      },
    ]);
    const changes = vi.fn();
    editor.onChange(changes);
    search.setQuery({ searchTerm: "cat" });
    search.nextMatch();
    search.previousMatch();
    expect(changes).not.toHaveBeenCalled();
    const { from } = matchRanges(editor)[0];
    editor.transact((tr) => tr.insertText("x", from));
    const beforeReplace = editor.document;
    search.replaceAll("catcat");
    expect(editor.document).toMatchObject([
      {
        id: "p",
        content: [{ text: "xcatcat", styles: { bold: true } }],
        children: [{ id: "child", content: [{ text: "catcat" }] }],
      },
      {
        id: "table",
        type: "table",
        content: {
          rows: [
            {
              cells: [
                { content: [{ text: "catcat" }] },
                { content: [{ text: "safe" }] },
              ],
            },
          ],
        },
      },
    ]);
    expect(search.store.state.matches).toHaveLength(6);
    expect(editor.undo()).toBe(true);
    expect(editor.document).toEqual(beforeReplace);
    expect(search.store.state.matches).toHaveLength(3);
    expect(editor.undo()).toBe(true);
    expect(editor.prosemirrorState.doc.textContent).toBe("catcatcatsafe");
    expect(editor.redo()).toBe(true);
    expect(editor.document).toEqual(beforeReplace);
  });

  it("keeps searching but refuses replacements while read-only", () => {
    const { editor, search } = setup();
    const before = editor.document;
    editor.getExtension(ReadOnlyExtension)!.setReadOnly(true, "test");
    search.setQuery({ searchTerm: "cat" });
    search.nextMatch();
    search.replace("dog");
    search.replaceAll("");
    expect(search.store.state.matches).toHaveLength(3);
    expect(editor.document).toEqual(before);
  });

  it("publishes query and accepted edits through the native store and clears without editing", () => {
    const { editor, search } = setup([{ id: "p", content: "cat" }]);
    expect(search.store.state).toMatchObject({
      query: null,
      matches: [],
      currentIndex: null,
    });
    const publish = vi.fn();
    cleanup.push(
      search.store.subscribe(({ currentVal }) => publish(currentVal)),
    );
    search.setQuery({ searchTerm: "cat" });
    expect(publish).toHaveBeenLastCalledWith(search.store.state);
    expect(search.store.state.matches).toHaveLength(1);
    editor.updateBlock("p", { content: "prefix cat cat" });
    expect(publish).toHaveBeenLastCalledWith(search.store.state);
    expect(search.store.state.query?.searchTerm).toBe("cat");
    expect(matchedText(editor)).toEqual(["cat", "cat"]);
    expect(search.store.state.matches).toHaveLength(2);
    // The first match follows the old position, regardless of text identity.
    expect(search.store.state.currentIndex).toBe(0);
    search.previousMatch();
    search.replace("dog");
    expect(editor.prosemirrorState.doc.textContent).toBe("prefix cat dog");
    editor.updateBlock("p", { content: "no matches" });
    expect(search.store.state.matches).toEqual([]);
    expect(search.store.state.currentIndex).toBeNull();
    editor.updateBlock("p", { content: "cat cat" });
    expect(search.store.state.matches).toHaveLength(2);
    const before = editor.document;
    search.clearSearch();
    expect(publish).toHaveBeenLastCalledWith(search.store.state);
    expect(search.store.state).toMatchObject({
      query: null,
      matches: [],
      currentIndex: null,
    });
    expect(matchRanges(editor)).toEqual([]);
    expect(editor.document).toEqual(before);
    editor.updateBlock("p", { content: "cat" });
    expect(search.store.state.matches).toEqual([]);
  });

  it("keeps results on the accepted document after rejection and retains query preferences", () => {
    const { editor, search } = setup([{ id: "p", content: "cat cat" }]);
    search.setQuery({ searchTerm: "cat" });
    const before = editor.document;
    const unsubscribe = editor.onBeforeChange(() => false);
    cleanup.push(unsubscribe);
    search.replaceAll("dog");
    expect(editor.document).toEqual(before);
    expect(search.store.state.matches).toHaveLength(2);
    const { from } = matchRanges(editor)[0];
    editor.transact((tr) => {
      search.setQuery({ searchTerm: "dog", caseSensitive: true });
      tr.insertText("dog ", from);
    });
    expect(editor.document).toEqual(before);
    expect(search.store.state).toMatchObject({
      query: { searchTerm: "dog", caseSensitive: true },
      matches: [],
      currentIndex: null,
    });
    expect(matchRanges(editor)).toEqual([]);
  });

  it("supports typed custom queries, lazy block getters and match-change callbacks", () => {
    type Query = { needle: string };
    const blockGetters: Parameters<
      SearchAndReplaceMatcher<Query>
    >[0]["getBlock"][] = [];
    const matcher: SearchAndReplaceMatcher<Query> = ({
      query,
      text,
      getBlock,
    }) => {
      blockGetters.push(getBlock);
      return defaultMatcher({
        query: { searchTerm: query.needle },
        text,
        getBlock,
      });
    };
    const factory = SearchAndReplaceExtension({ matcher });
    expectTypeOf<ReturnType<typeof factory>["setQuery"]>()
      .parameter(0)
      .toEqualTypeOf<Query>();
    const notifications: SearchAndReplaceMatchChange[] = [];
    const CustomSearch = SearchAndReplaceExtension<Query>;
    const editor = BlockNoteEditor.create({
      initialContent: [{ id: "p", content: "😀 cat cat" }],
      extensions: [
        CustomSearch({
          matcher,
          onMatchChange(context) {
            notifications.push(context);
            // A consumer may opt out of reveal without suppressing highlights.
          },
        }),
      ],
    });
    installStatePlugins(editor);
    const search = editor.getExtension(CustomSearch)!;
    search.setQuery({ needle: "cat" });
    expect(blockGetters[0]()).toMatchObject({ id: "p" });
    expect(search.store.state.matches[0].getBlock()).toMatchObject({
      id: "p",
      content: [{ text: "😀 cat cat" }],
    });
    expect(matchedText(editor)).toEqual(["cat", "cat"]);
    search.nextMatch();
    editor.updateBlock("p", { content: "cat" });
    expect(matchedText(editor)).toEqual(["cat"]);
    expect(
      notifications.map(({ reason, totalMatches, currentMatch }) => ({
        reason,
        totalMatches,
        blockId: currentMatch?.getBlock().id,
      })),
    ).toEqual([
      { reason: "query", totalMatches: 2, blockId: "p" },
      { reason: "navigation", totalMatches: 2, blockId: "p" },
      { reason: "document", totalMatches: 1, blockId: "p" },
    ]);
  });
});
