import { BlockNoteEditor, type PartialBlock } from "@blocknote/core";
import type { Node } from "prosemirror-model";
import { EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import {
  createReplayPlugin,
  createReplayTimeline,
  type ReplayChange,
  replayParts,
} from "./replayAnimation.js";

function docOfBlocks(blocks: PartialBlock[]) {
  return BlockNoteEditor.create({
    initialContent: blocks,
    trailingBlock: false,
  }).prosemirrorState.doc;
}

function docOf(texts: string[]) {
  return docOfBlocks(texts.map((content) => ({ type: "paragraph", content })));
}

/** The parts as short texts: the kind, the text of the range, and the delay. */
function summaryOf(
  doc: Node,
  changeOf: (node: Node) => ReplayChange | undefined,
) {
  return replayParts(doc, changeOf).map(
    (part) =>
      `${part.kind} "${doc.textBetween(part.from, part.to)}" at ${Math.round(part.delay)}`,
  );
}

/** A change for the text node with the text, and for no other node. */
function textIs(text: string, kind: ReplayChange["kind"], key = "call-1") {
  return (node: Node): ReplayChange | undefined =>
    node.text === text ? { kind, key } : undefined;
}

/** A change for the block container with the number (from 0), and for no other node. */
function blockIs(index: number, kind: ReplayChange["kind"], key = "call-1") {
  return (node: Node, doc: Node): ReplayChange | undefined => {
    const blocks: Node[] = [];
    doc.descendants((child) => {
      if (child.type.name === "blockContainer") {
        blocks.push(child);
      }
      return true;
    });
    return blocks[index] === node ? { kind, key } : undefined;
  };
}

describe("the parts of the replay animation", () => {
  it("has one part for each word of new text, in sequence", () => {
    const doc = docOf(["First second third."]);

    // 14 ms for each character.
    expect(summaryOf(doc, textIs("First second third.", "insert"))).toEqual([
      'new "First " at 0',
      'new "second " at 84',
      'new "third." at 182',
    ]);
  });

  it("shows a new block, and then its text word by word", () => {
    const doc = docOf(["One two", "Three"]);
    const block = blockIs(0, "insert");

    expect(summaryOf(doc, (node) => block(node, doc))).toEqual([
      // The block appears in 120 ms.
      'new-block "One two" at 0',
      'new "One " at 120',
      'new "two" at 176',
    ]);
  });

  it("shows a new block in a new block in its turn, after the text of its parent", () => {
    const doc = docOfBlocks([
      {
        type: "bulletListItem",
        content: "Parent",
        children: [{ type: "bulletListItem", content: "Child" }],
      },
    ]);
    const block = blockIs(0, "insert");

    expect(summaryOf(doc, (node) => block(node, doc))).toEqual([
      'new-block "ParentChild" at 0',
      'new "Parent" at 120',
      // 84 ms for the text of the parent, and 150 ms to go to the next block.
      'new-block "Child" at 354',
      'new "Child" at 474',
    ]);
  });

  it("shows removed text faster than new text, and a removed block as a whole", () => {
    const doc = docOf(["Old words", "A removed block"]);
    const block = blockIs(1, "delete");

    // 5 ms for each character.
    expect(summaryOf(doc, textIs("Old words", "delete"))).toEqual([
      'removed "Old " at 0',
      'removed "words" at 20',
    ]);
    expect(summaryOf(doc, (node) => block(node, doc))).toEqual([
      'removed-block "A removed block" at 0',
    ]);
  });

  it("gives a block with a new type a highlight, and continues with the changes in it", () => {
    const doc = docOf(["A heading now"]);
    const block = blockIs(0, "modify");
    const text = textIs("A heading now", "insert");

    expect(summaryOf(doc, (node) => block(node, doc) ?? text(node))).toEqual([
      'changed-block "A heading now" at 0',
      // 400 ms for the highlight.
      'new "A " at 400',
      'new "heading " at 428',
      'new "now" at 540',
    ]);
  });

  it("adds the time to go to a different block", () => {
    const doc = docOf(["One", "Two"]);

    expect(
      summaryOf(doc, (node) =>
        node.isText ? { kind: "insert", key: "call-1" } : undefined,
      ),
    ).toEqual(['new "One" at 0', 'new "Two" at 192']);
  });

  it("runs a long tool call faster: it takes 6 seconds", () => {
    const doc = docOf(["word ".repeat(400)]);

    const parts = replayParts(doc, (node) =>
      node.isText ? { kind: "insert", key: "call-1" } : undefined,
    );

    const last = parts.at(-1)!;
    expect(last.delay + last.duration).toBeCloseTo(6000);
  });
});

describe("the states of the parts at a time", () => {
  /** The state of each part, with the text of its range. */
  function statesOf(
    timeline: ReturnType<typeof createReplayTimeline>,
    doc: Node,
    changeOf: (node: Node) => ReplayChange | undefined,
  ) {
    return timeline
      .frame(doc, changeOf)
      .parts.map(
        (part) => `${part.state} "${doc.textBetween(part.from, part.to)}"`,
      );
  }

  it("has one active part at a time, and tells the time of the next change", () => {
    const doc = docOf(["First second third."]);
    let time = 1000;
    const timeline = createReplayTimeline(() => time);
    const change = textIs("First second third.", "insert");

    expect(statesOf(timeline, doc, change)).toEqual([
      'active "First "',
      'pending "second "',
      'pending "third."',
    ]);
    // The first word is complete after 84 ms.
    expect(timeline.frame(doc, change).next).toBe(1084);

    time = 1084;
    expect(statesOf(timeline, doc, change)).toEqual([
      'done "First "',
      'active "second "',
      'pending "third."',
    ]);

    // 19 characters: 266 ms.
    time = 1265;
    expect(timeline.frame(doc, change).complete).toBe(false);
    time = 1266;
    const frame = timeline.frame(doc, change);
    expect(frame.complete).toBe(true);
    expect(frame.next).toBeUndefined();
  });

  it("starts a tool call when the tool call before it is complete", () => {
    const doc = docOf(["First call", "Second"]);
    let time = 1000;
    const timeline = createReplayTimeline(() => time);
    const first = textIs("First call", "insert", "call-1");
    const second = textIs("Second", "insert", "call-2");
    const both = (node: Node) => first(node) ?? second(node);

    // The first tool call arrives: 10 characters, 140 ms.
    expect(statesOf(timeline, doc, first)).toEqual([
      'active "First "',
      'pending "call"',
    ]);

    // The second tool call arrives 40 ms later: it starts after the first.
    time = 1040;
    expect(statesOf(timeline, doc, both)).toEqual([
      'active "First "',
      'pending "call"',
      'pending "Second"',
    ]);
    time = 1139;
    expect(statesOf(timeline, doc, both).at(-1)).toBe('pending "Second"');
    time = 1140;
    expect(statesOf(timeline, doc, both).at(-1)).toBe('active "Second"');
  });

  it("does not start a part again if the document shows its change again", () => {
    // The proposal mode removes all suggestions and adds them again for
    // each new tool call.
    const doc = docOf(["First call"]);
    let time = 1000;
    const timeline = createReplayTimeline(() => time);
    const change = textIs("First call", "insert");
    timeline.frame(doc, change);

    time = 1090;
    expect(timeline.frame(doc, () => undefined).complete).toBe(false);
    expect(statesOf(timeline, doc, change)).toEqual([
      'done "First "',
      'active "call"',
    ]);
  });
});

describe("the replay animation in a view", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  /** A view of a document with the plugin. All text of a paragraph in `fresh` is a new change. */
  function viewOf(texts: string[], fresh: Set<string>) {
    const completed: string[][] = [];
    const replay = createReplayPlugin({
      changeOf: (node) =>
        node.isText && fresh.has(node.text ?? "")
          ? { kind: "insert", key: node.text ?? "" }
          : undefined,
      onComplete(keys) {
        completed.push(keys);
        for (const key of keys) {
          fresh.delete(key);
        }
      },
    });
    const view = new EditorView(document.createElement("div"), {
      state: EditorState.create({
        doc: docOf(texts),
        plugins: [replay.plugin],
      }),
    });
    return { view, replay, completed };
  }

  /** The text that a user sees: the text without the parts that are not yet reached. */
  function visibleTextOf(view: EditorView) {
    const dom = view.dom.cloneNode(true) as HTMLElement;
    for (const pending of dom.querySelectorAll(".bn-agent-pending")) {
      pending.remove();
    }
    return dom.textContent;
  }

  it("shows new text word by word as the time goes on, and then has no decoration", () => {
    vi.useFakeTimers();
    const { view, completed } = viewOf(
      ["Before.", "First second third."],
      new Set(["First second third."]),
    );

    expect(visibleTextOf(view)).toBe("Before.First ");
    expect(view.dom.querySelector(".bn-agent-active")?.textContent).toBe(
      "First ",
    );

    vi.advanceTimersByTime(90);
    expect(visibleTextOf(view)).toBe("Before.First second ");

    vi.advanceTimersByTime(100);
    expect(visibleTextOf(view)).toBe("Before.First second third.");
    expect(completed).toEqual([]);

    vi.advanceTimersByTime(100);
    expect(view.dom.querySelector('[class*="bn-agent-"]')).toBeNull();
    expect(completed).toEqual([["First second third."]]);
    // No timer is left: the view does not update again.
    expect(vi.getTimerCount()).toBe(0);
    view.destroy();
  });

  it("has no decoration and no timer for a document without a new change", () => {
    vi.useFakeTimers();
    const { view, completed } = viewOf(["Before."], new Set());

    expect(view.dom.querySelector('[class*="bn-agent-"]')).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
    expect(completed).toEqual([]);
    view.destroy();
  });

  it("stops at once", () => {
    vi.useFakeTimers();
    const fresh = new Set(["First second third."]);
    const { view, replay } = viewOf(["First second third."], fresh);
    expect(visibleTextOf(view)).toBe("First ");

    fresh.clear();
    replay.stop();
    vi.advanceTimersByTime(90);

    expect(visibleTextOf(view)).toBe("First second third.");
    expect(view.dom.querySelector('[class*="bn-agent-"]')).toBeNull();
    view.destroy();
  });
});
