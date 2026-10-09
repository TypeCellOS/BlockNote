import { getChangedRanges as tiptapGetChangedRanges } from "@tiptap/core";
import { Node, Schema, Slice } from "prosemirror-model";
import {
  AddNodeMarkStep,
  Mapping,
  RemoveNodeMarkStep,
  ReplaceStep,
  Transform,
  canJoin,
  canSplit,
  findWrapping,
  liftTarget,
} from "prosemirror-transform";
import { describe, expect, it } from "vite-plus/test";

import { getChangedRanges } from "./getChangedRanges.js";

const schema = new Schema({
  nodes: {
    doc: {
      content: "block+",
      attrs: { title: { default: null } },
      marks: "_",
    },
    paragraph: {
      group: "block",
      content: "text*",
      attrs: { level: { default: 0 } },
      marks: "_",
    },
    heading: { group: "block", content: "text*", marks: "_" },
    blockquote: { group: "block", content: "block+", marks: "_" },
    text: {},
  },
  marks: { strong: {}, comment: {} },
});

function paragraph(text: string) {
  return schema.node("paragraph", null, text ? schema.text(text) : []);
}

/** Paragraphs at 0-5, 5-10 and 10-15, with text at 1-4, 6-9 and 11-14. */
function threeParagraphs() {
  return schema.node("doc", null, [
    paragraph("abc"),
    paragraph("def"),
    paragraph("ghi"),
  ]);
}

/** `[old from, old to, new from, new to]` of each changed range. */
function ranges(implementation: typeof getChangedRanges, transform: Transform) {
  return implementation(transform).map(({ oldRange, newRange }) => [
    oldRange.from,
    oldRange.to,
    newRange.from,
    newRange.to,
  ]);
}

const cases: [string, (tr: Transform) => void, number[][]][] = [
  ["no steps", () => {}, []],
  ["insert text", (tr) => tr.insert(2, schema.text("X")), [[2, 2, 2, 3]]],
  ["delete text", (tr) => tr.delete(6, 8), [[6, 8, 6, 6]]],
  [
    "replace text",
    (tr) => tr.replaceWith(6, 8, schema.text("XY")),
    [[6, 8, 6, 8]],
  ],
  [
    "two inserts in document order",
    (tr) => tr.insert(2, schema.text("X")).insert(8, schema.text("Y")),
    [
      [2, 2, 2, 3],
      [7, 7, 8, 9],
    ],
  ],
  [
    "two inserts in reverse order",
    (tr) => tr.insert(7, schema.text("Y")).insert(2, schema.text("X")),
    [
      [7, 7, 8, 9],
      [2, 2, 2, 3],
    ],
  ],
  [
    "two inserts at the same position",
    (tr) => tr.insert(2, schema.text("X")).insert(2, schema.text("Y")),
    [[2, 2, 2, 4]],
  ],
  [
    "insert, then delete inside it",
    (tr) => tr.insert(2, schema.text("XYZ")).delete(3, 4),
    [[2, 2, 2, 4]],
  ],
  [
    "insert, then delete around it",
    (tr) => tr.insert(7, schema.text("X")).delete(6, 9),
    [[6, 8, 6, 6]],
  ],
  ["delete a paragraph", (tr) => tr.delete(5, 10), [[5, 10, 5, 5]]],
  [
    "insert a paragraph",
    (tr) => tr.insert(5, paragraph("new")),
    [[5, 5, 5, 10]],
  ],
  [
    "add a mark",
    (tr) => tr.addMark(1, 3, schema.marks.strong.create()),
    [[1, 3, 1, 3]],
  ],
  [
    "add two marks to the same range",
    (tr) =>
      tr
        .addMark(1, 3, schema.marks.strong.create())
        .addMark(1, 3, schema.marks.comment.create()),
    [[1, 3, 1, 3]],
  ],
  [
    "remove a mark inside an added one",
    (tr) =>
      tr
        .addMark(1, 4, schema.marks.strong.create())
        .removeMark(2, 3, schema.marks.strong),
    [[1, 4, 1, 4]],
  ],
  // Steps without a position range are skipped (see `getChangedRangeWithAttrs`).
  ["set a node attribute", (tr) => tr.setNodeAttribute(5, "level", 1), []],
  ["set a doc attribute", (tr) => tr.setDocAttribute("title", "x"), []],
  [
    "add a node mark",
    (tr) => tr.addNodeMark(5, schema.marks.comment.create()),
    [],
  ],
  [
    "wrap a paragraph",
    (tr) => {
      const range = tr.doc.resolve(6).blockRange()!;
      tr.wrap(range, findWrapping(range, schema.nodes.blockquote)!);
    },
    [
      [5, 5, 5, 6],
      [10, 10, 11, 12],
    ],
  ],
  [
    "wrap, then lift",
    (tr) => {
      const wrapRange = tr.doc.resolve(6).blockRange()!;
      tr.wrap(wrapRange, findWrapping(wrapRange, schema.nodes.blockquote)!);
      const liftRange = tr.doc.resolve(7).blockRange()!;
      tr.lift(liftRange, liftTarget(liftRange)!);
    },
    [
      [5, 5, 5, 5],
      [10, 10, 10, 10],
    ],
  ],
  [
    "large replace, then edit inside it",
    (tr) =>
      tr
        .replaceWith(1, 14, schema.text("XXXXXXXXXX"))
        .insert(4, schema.text("Y")),
    [[1, 14, 1, 12]],
  ],
  [
    "edit, then large replace around it",
    (tr) => tr.insert(7, schema.text("Y")).replaceWith(5, 16, paragraph("Z")),
    [[5, 15, 5, 8]],
  ],
  [
    "mark inside an insert",
    (tr) =>
      tr
        .insert(2, schema.text("XYZ"))
        .addMark(3, 4, schema.marks.strong.create()),
    [[2, 2, 2, 5]],
  ],
];

describe.each([
  ["Tiptap", tiptapGetChangedRanges],
  ["BlockNote", getChangedRanges],
])("getChangedRanges (%s)", (_, implementation) => {
  it.each(cases)("%s", (_name, change, expected) => {
    const tr = new Transform(threeParagraphs());
    change(tr);
    expect(ranges(implementation, tr)).toEqual(expected);
  });
});

/** A seeded random number in `[0, n)`. */
function random(seed: number) {
  let state = seed;
  return (n: number) => {
    state = (state * 16807) % 2147483647;
    return state % n;
  };
}

/** Applies one random valid change to `tr`. */
function randomChange(tr: Transform, rnd: (n: number) => number) {
  const textblocks: { pos: number; node: Node }[] = [];
  tr.doc.descendants((node, pos) => {
    if (node.isTextblock) {
      textblocks.push({ pos, node });
    }
    return true;
  });
  const { pos, node } = textblocks[rnd(textblocks.length)];
  const textPos = (offset: number) => pos + 1 + offset;
  const size = node.content.size;
  const text = "xyz".slice(rnd(3));
  const docSize = tr.doc.content.size;

  switch (rnd(15)) {
    case 0:
      tr.insert(textPos(rnd(size + 1)), schema.text("abc".slice(rnd(3))));
      break;
    case 1: {
      const from = rnd(size + 1);
      tr.delete(textPos(from), textPos(from + rnd(size - from + 1)));
      break;
    }
    case 2: {
      const from = rnd(size + 1);
      const to = textPos(from + rnd(size - from + 1));
      if (text) {
        tr.replaceWith(textPos(from), to, schema.text(text));
      }
      break;
    }
    case 3:
      if (tr.doc.childCount > 1) {
        const index = rnd(tr.doc.childCount);
        let start = 0;
        for (let i = 0; i < index; i++) {
          start += tr.doc.child(i).nodeSize;
        }
        tr.delete(start, start + tr.doc.child(index).nodeSize);
      }
      break;
    case 4: {
      const index = rnd(tr.doc.childCount + 1);
      let start = 0;
      for (let i = 0; i < index; i++) {
        start += tr.doc.child(i).nodeSize;
      }
      tr.insert(start, paragraph(text));
      break;
    }
    case 5: {
      const from = rnd(docSize + 1);
      const to = from + rnd(docSize - from + 1);
      const mark = [schema.marks.strong, schema.marks.comment][rnd(2)];
      if (rnd(2)) {
        tr.addMark(from, to, mark.create());
      } else {
        tr.removeMark(from, to, mark);
      }
      break;
    }
    case 6:
      tr.setNodeAttribute(pos, "level", rnd(3));
      break;
    case 7: {
      const range = tr.doc.resolve(textPos(0)).blockRange();
      const target = range && liftTarget(range);
      if (range && target !== null && target !== undefined) {
        tr.lift(range, target);
      }
      break;
    }
    case 8: {
      const range = tr.doc.resolve(textPos(0)).blockRange();
      const wrapping = range && findWrapping(range, schema.nodes.blockquote);
      if (range && wrapping) {
        tr.wrap(range, wrapping);
      }
      break;
    }
    case 9:
      if (rnd(2)) {
        tr.maybeStep(new AddNodeMarkStep(pos, schema.marks.comment.create()));
      } else {
        tr.setDocAttribute("title", String(rnd(3)));
      }
      break;
    case 10: {
      const at = textPos(rnd(size + 1));
      if (canSplit(tr.doc, at)) {
        tr.split(at);
      }
      break;
    }
    case 11:
      // What `tr.join` makes, without its throw when the join doesn't fit.
      if (canJoin(tr.doc, pos)) {
        tr.maybeStep(new ReplaceStep(pos - 1, pos + 1, Slice.empty, true));
      }
      break;
    case 12:
      tr.setBlockType(
        pos,
        pos + node.nodeSize,
        [schema.nodes.paragraph, schema.nodes.heading][rnd(2)],
      );
      break;
    case 13:
      tr.maybeStep(new RemoveNodeMarkStep(pos, schema.marks.comment.create()));
      break;
    case 14: {
      const from = rnd(docSize + 1);
      tr.delete(from, from + rnd(docSize - from + 1));
      break;
    }
  }
}

describe("getChangedRanges", () => {
  it("returns the same ranges as Tiptap for random changes", () => {
    const rnd = random(42);
    const stepTypes = new Set<string>();
    for (let run = 0; run < 3000; run++) {
      const tr = new Transform(
        schema.node(
          "doc",
          null,
          Array.from({ length: 1 + rnd(6) }, () =>
            paragraph("abcdef".slice(rnd(7))),
          ),
        ),
      );
      const stepCount = 1 + rnd(run % 10 === 0 ? 200 : 30);
      for (let i = 0; i < stepCount; i++) {
        randomChange(tr, rnd);
      }
      tr.steps.forEach((step) => stepTypes.add(step.constructor.name));
      expect(ranges(getChangedRanges, tr)).toEqual(
        ranges(tiptapGetChangedRanges, tr),
      );
    }
    expect([...stepTypes].sort()).toEqual([
      "AddMarkStep",
      "AddNodeMarkStep",
      "AttrStep",
      "DocAttrStep",
      "RemoveMarkStep",
      "RemoveNodeMarkStep",
      "ReplaceAroundStep",
      "ReplaceStep",
    ]);
  });

  it("returns the same ranges as Tiptap for many steps in document order and in reverse", () => {
    const blocks = Array.from({ length: 300 }, (_, i) => paragraph(`p${i}`));
    for (const reverse of [false, true]) {
      const tr = new Transform(schema.node("doc", null, blocks));
      const starts: number[] = [];
      tr.doc.forEach((_node, offset) => starts.push(offset));
      for (const start of reverse ? starts.reverse() : starts) {
        tr.insert(tr.mapping.map(start + 1), schema.text("!"));
        tr.setNodeAttribute(tr.mapping.map(start), "level", 1);
      }
      expect(ranges(getChangedRanges, tr)).toEqual(
        ranges(tiptapGetChangedRanges, tr),
      );
    }
  });

  it("returns the same ranges as Tiptap for a mirrored mapping", () => {
    const tr = new Transform(threeParagraphs());
    tr.insert(2, schema.text("X"));
    tr.step(tr.steps[0].invert(tr.docs[0]));
    tr.insert(7, schema.text("Y"));
    const mirrored = new Mapping();
    mirrored.appendMap(tr.mapping.maps[0]);
    mirrored.appendMap(tr.mapping.maps[1], 0);
    mirrored.appendMap(tr.mapping.maps[2]);
    Object.assign(tr, { mapping: mirrored });

    expect(ranges(getChangedRanges, tr)).toEqual(
      ranges(tiptapGetChangedRanges, tr),
    );
  });
});
