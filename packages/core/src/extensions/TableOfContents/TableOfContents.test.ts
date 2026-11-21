/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { BlockNoteSchema } from "../../blocks/BlockNoteSchema.js";
import {
  defaultBlockSpecs,
  defaultInlineContentSpecs,
  type PartialBlock,
} from "../../blocks/defaultBlocks.js";
import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { createInlineContentSpec } from "../../schema/index.js";
import {
  getTableOfContentsEntries,
  TableOfContentsExtension,
} from "./TableOfContents.js";

let editor: BlockNoteEditor | undefined;
let restoreLayout: (() => void) | undefined;

afterEach(() => {
  editor?.unmount();
  editor = undefined;
  restoreLayout?.();
  restoreLayout = undefined;
});

function mountEditor(initialContent: PartialBlock[]) {
  editor = BlockNoteEditor.create({
    initialContent,
    extensions: [TableOfContentsExtension()],
  });
  editor.mount(document.createElement("div"));
  return { editor, toc: editor.getExtension(TableOfContentsExtension)! };
}

function heading(id: string, level: number, content: string): PartialBlock {
  return { id, type: "heading", props: { level }, content };
}

function blockElement(editor: BlockNoteEditor, id: string) {
  return editor.domElement!.querySelector(
    `[data-node-type="blockContainer"][data-id="${id}"]`,
  );
}

/**
 * jsdom lays nothing out and has no `scrollIntoView`. Treats the elements
 * `isLaidOut` accepts as laid out, and returns a mock of `scrollIntoView`,
 * whose contexts are the elements scrolled to.
 */
function mockLayout(isLaidOut: (element: Element) => boolean = () => true) {
  const scrollIntoView = vi.fn();
  Element.prototype.scrollIntoView = scrollIntoView;
  const getClientRects = vi
    .spyOn(Element.prototype, "getClientRects")
    .mockImplementation(function (this: Element) {
      return (isLaidOut(this)
        ? [new DOMRect(0, 0, 100, 20)]
        : []) as unknown as DOMRectList;
    });
  restoreLayout = () => {
    delete (Element.prototype as Partial<Element>).scrollIntoView;
    getClientRects.mockRestore();
  };
  return scrollIntoView;
}

// Custom inline content whose content is a plain string, and none at all.
const math = createInlineContentSpec(
  { type: "math", propSchema: {}, content: "plain" },
  {
    render: () => {
      const dom = document.createElement("span");
      return { dom, contentDOM: dom };
    },
  },
);
const mention = createInlineContentSpec(
  { type: "mention", propSchema: { user: { default: "" } }, content: "none" },
  {
    render: (inlineContent) => {
      const dom = document.createElement("span");
      dom.textContent = `@${inlineContent.props.user}`;
      return { dom };
    },
  },
);

describe("getTableOfContentsEntries", () => {
  it("lists the headings of a document without a mounted editor", () => {
    const { document: blocks } = BlockNoteEditor.create({
      initialContent: [
        heading("a", 2, "A"),
        { type: "paragraph", content: "Body" },
        heading("b", 3, "B"),
      ],
    });

    expect(getTableOfContentsEntries(blocks)).toEqual([
      { blockId: "a", title: "A", level: 2, depth: 0 },
      { blockId: "b", title: "B", level: 3, depth: 1 },
    ]);
    expect(getTableOfContentsEntries([])).toEqual([]);
  });

  it("titles entries with the text of custom inline content, when it has any", () => {
    const { document: blocks } = BlockNoteEditor.create({
      schema: BlockNoteSchema.create({
        blockSpecs: defaultBlockSpecs,
        inlineContentSpecs: { ...defaultInlineContentSpecs, math, mention },
      }),
      initialContent: [
        {
          id: "custom",
          type: "heading",
          content: [
            "Ask ",
            { type: "mention", props: { user: "Ada" } },
            " to solve ",
            { type: "math", content: "x^2" },
          ],
        },
      ],
    });

    expect(getTableOfContentsEntries(blocks)).toEqual([
      { blockId: "custom", title: "Ask to solve x^2", level: 1, depth: 0 },
    ]);
  });
});

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

  it("titles entries with the heading's text, links included and whitespace collapsed, and skips headings without any", () => {
    const { toc } = mountEditor([
      {
        id: "linked",
        type: "heading",
        content: [
          { type: "text", text: "  Read ", styles: {} },
          { type: "link", href: "https://example.com", content: "the docs " },
        ],
      },
      heading("spaced", 1, "Split\nover lines,\twith   wide\u00a0gaps"),
      heading("blank", 1, "   "),
      heading("empty", 1, ""),
    ]);

    expect(toc.store.state.entries.map((e) => [e.blockId, e.title])).toEqual([
      ["linked", "Read the docs"],
      ["spaced", "Split over lines, with wide gaps"],
    ]);
  });

  it("counts depth in levels below the shallowest heading level present", () => {
    const { toc } = mountEditor([
      heading("a", 2, "A"),
      heading("b", 3, "B"),
      heading("c", 5, "C"),
    ]);

    expect(toc.store.state.entries.map((e) => [e.blockId, e.depth])).toEqual([
      ["a", 0],
      ["b", 1],
      ["c", 3],
    ]);
  });
});

describe("TableOfContentsExtension store", () => {
  it("updates when a heading is inserted, renamed, re-leveled or removed", () => {
    const { editor, toc } = mountEditor([
      heading("h", 1, "Heading"),
      { id: "p", type: "paragraph", content: "Body" },
    ]);
    function titles() {
      return toc.store.state.entries.map((e) => `${e.level}:${e.title}`);
    }
    function depths() {
      return toc.store.state.entries.map((e) => e.depth);
    }

    editor.insertBlocks([heading("new", 2, "New")], "p", "after");
    expect(titles()).toEqual(["1:Heading", "2:New"]);

    editor.setTextCursorPosition("h", "end");
    editor.insertInlineContent("!");
    expect(titles()).toEqual(["1:Heading!", "2:New"]);

    editor.updateBlock("new", { props: { level: 3 } });
    expect(titles()).toEqual(["1:Heading!", "3:New"]);
    expect(depths()).toEqual([0, 2]);

    // Depths follow the shallowest level, also for headings left as they are.
    editor.updateBlock("h", { props: { level: 2 } });
    expect(titles()).toEqual(["2:Heading!", "3:New"]);
    expect(depths()).toEqual([0, 1]);

    editor.removeBlocks(["h"]);
    expect(titles()).toEqual(["3:New"]);
    expect(depths()).toEqual([0]);
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

  it("stops updating once the editor is unmounted, and catches up when it's mounted again", () => {
    const { editor, toc } = mountEditor([
      heading("h", 1, "Heading"),
      { id: "p", type: "paragraph", content: "Body" },
    ]);
    const listener = vi.fn();
    toc.store.subscribe(listener);

    editor.unmount();
    editor.insertBlocks([heading("new", 1, "New")], "p", "after");

    expect(listener).not.toHaveBeenCalled();
    expect(toc.store.state.entries.map((e) => e.blockId)).toEqual(["h"]);

    editor.mount(document.createElement("div"));

    expect(listener).toHaveBeenCalledTimes(1);
    expect(toc.store.state.entries.map((e) => e.blockId)).toEqual(["h", "new"]);
  });
});

describe("TableOfContentsExtension scrollToEntry", () => {
  it("scrolls the heading into view and returns whether there was one", () => {
    const { editor, toc } = mountEditor([
      heading("a", 1, "A"),
      { id: "p", type: "paragraph", content: "Body" },
    ]);
    const scrollIntoView = mockLayout();

    expect(toc.scrollToEntry("a")).toBe(true);
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(scrollIntoView.mock.contexts[0]).toBe(blockElement(editor, "a"));
    expect(scrollIntoView.mock.calls[0][0]).toMatchObject({ block: "start" });

    expect(toc.scrollToEntry("unknown")).toBe(false);

    editor.unmount();
    expect(toc.scrollToEntry("a")).toBe(false);
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
  });

  it("scrolls to the nearest laid-out block around a heading in a collapsed toggle", () => {
    const { editor, toc } = mountEditor([
      {
        id: "toggle",
        type: "heading",
        props: { level: 1, isToggleable: true },
        content: "Toggle",
        children: [heading("hidden", 2, "Hidden")],
      },
    ]);
    const hidden = blockElement(editor, "hidden");
    const scrollIntoView = mockLayout((element) => element !== hidden);

    expect(toc.scrollToEntry("hidden")).toBe(true);
    expect(scrollIntoView.mock.contexts[0]).toBe(
      blockElement(editor, "toggle"),
    );
  });

  it("doesn't scroll when no block around the heading is laid out", () => {
    const { toc } = mountEditor([heading("a", 1, "A")]);
    const scrollIntoView = mockLayout(() => false);

    expect(toc.scrollToEntry("a")).toBe(false);
    expect(scrollIntoView).not.toHaveBeenCalled();
  });
});
