/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import type { PartialBlock } from "../../blocks/defaultBlocks.js";
import {
  TableOfContentsExtension,
  type TableOfContentsOptions,
} from "./TableOfContents.js";

let editor: BlockNoteEditor | undefined;

afterEach(() => {
  editor?.unmount();
  editor = undefined;
});

function mountEditor(
  initialContent: PartialBlock[],
  options?: TableOfContentsOptions,
) {
  editor = BlockNoteEditor.create({
    initialContent,
    extensions: [TableOfContentsExtension(options)],
  });
  editor.mount(document.createElement("div"));
  return { editor, toc: editor.getExtension(TableOfContentsExtension)! };
}

function heading(id: string, level: number, content: string): PartialBlock {
  return { id, type: "heading", props: { level }, content };
}

describe("TableOfContentsExtension entries", () => {
  it("lists headings in document order, including headings nested in other blocks", () => {
    const { toc } = mountEditor([
      heading("intro", 2, "Intro"),
      {
        type: "bulletListItem",
        content: "Item",
        children: [heading("in-list", 3, "In a list")],
      },
      {
        id: "toggle",
        type: "heading",
        props: { level: 2, isToggleable: true },
        content: "Toggle",
        children: [heading("in-toggle", 3, "In a toggle")],
      },
      { type: "paragraph", content: "Body" },
    ]);

    expect(toc.store.state.entries).toEqual([
      { blockId: "intro", title: "Intro", level: 2, depth: 0 },
      { blockId: "in-list", title: "In a list", level: 3, depth: 1 },
      { blockId: "toggle", title: "Toggle", level: 2, depth: 0 },
      { blockId: "in-toggle", title: "In a toggle", level: 3, depth: 1 },
    ]);
  });

  it("titles entries with the heading's text, links included, and skips headings without any", () => {
    const { toc } = mountEditor([
      {
        id: "linked",
        type: "heading",
        content: [
          { type: "text", text: "  Read ", styles: {} },
          { type: "link", href: "https://example.com", content: "the docs " },
        ],
      },
      heading("blank", 1, "   "),
      heading("empty", 1, ""),
    ]);

    expect(toc.store.state.entries.map((e) => [e.blockId, e.title])).toEqual([
      ["linked", "Read the docs"],
    ]);
  });

  it("counts depth from the shallowest heading present and leaves out headings below maxDepth", () => {
    const content = [
      heading("a", 2, "A"),
      heading("b", 3, "B"),
      heading("c", 4, "C"),
    ];

    const depths = mountEditor(content).toc.store.state.entries.map((e) => [
      e.blockId,
      e.depth,
    ]);
    expect(depths).toEqual([
      ["a", 0],
      ["b", 1],
    ]);

    editor!.unmount();
    const deeper = mountEditor(content, { maxDepth: 2 }).toc.store.state
      .entries;
    expect(deeper.map((e) => [e.blockId, e.depth])).toEqual([
      ["a", 0],
      ["b", 1],
      ["c", 2],
    ]);
  });
});

describe("TableOfContentsExtension store", () => {
  it("updates when a heading is inserted, renamed, re-leveled or removed", () => {
    const { editor, toc } = mountEditor([
      heading("h", 1, "Heading"),
      { id: "p", type: "paragraph", content: "Body" },
    ]);
    const titles = () =>
      toc.store.state.entries.map((e) => `${e.level}:${e.title}`);

    editor.insertBlocks([heading("new", 2, "New")], "p", "after");
    expect(titles()).toEqual(["1:Heading", "2:New"]);

    editor.setTextCursorPosition("h", "end");
    editor.insertInlineContent("!");
    expect(titles()).toEqual(["1:Heading!", "2:New"]);

    editor.updateBlock("new", { props: { level: 3 } });
    expect(titles()).toEqual(["1:Heading!"]);

    editor.updateBlock("h", { props: { level: 2 } });
    expect(titles()).toEqual(["2:Heading!", "3:New"]);

    editor.removeBlocks(["h"]);
    expect(titles()).toEqual(["3:New"]);
  });

  it("keeps the entries, without notifying, while the headings keep their text and level", () => {
    const { editor, toc } = mountEditor([
      heading("h", 1, "Heading"),
      { id: "p", type: "paragraph", content: "Body" },
      {
        id: "toggle",
        type: "heading",
        props: { level: 2, isToggleable: true },
        content: "Toggle",
        children: [{ id: "nested", type: "paragraph", content: "Nested" }],
      },
    ]);
    const entries = toc.store.state.entries;
    const listener = vi.fn();
    toc.store.subscribe(listener);

    editor.setTextCursorPosition("p", "end");
    editor.insertInlineContent(" typed");
    editor.setTextCursorPosition("nested", "end");
    editor.insertInlineContent(" typed");
    editor.updateBlock("p", { props: { textAlignment: "center" } });
    editor.insertBlocks([{ id: "p2", type: "paragraph" }], "p", "after");
    editor.removeBlocks(["p2"]);
    editor.updateBlock("h", { props: { textAlignment: "center" } });

    expect(listener).not.toHaveBeenCalled();
    expect(toc.store.state.entries).toBe(entries);
  });
});
