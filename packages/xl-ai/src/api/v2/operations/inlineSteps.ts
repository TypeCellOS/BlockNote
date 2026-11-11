import type { Mark, Node } from "prosemirror-model";
import { Fragment, Slice } from "prosemirror-model";
import type { Transform } from "prosemirror-transform";

import {
  alignText,
  charKind,
  gaps,
  isChanged,
  type MatchedPair,
  type TextUnit,
} from "../util/sequence/index.js";

/**
 * One unit of inline content in ProseMirror: a character (a code point, thus
 * never half of a surrogate pair) or an inline node that is not text.
 */
type Unit = TextUnit & {
  /** The offset from the start of the content. */
  offset: number;
  size: number;
  /** The marks. The key does not include them. */
  marks: readonly Mark[];
};

function unitsOf(content: Fragment): Unit[] {
  const units: Unit[] = [];
  content.forEach((node, offset) => {
    if (node.isText) {
      let charOffset = offset;
      for (const char of node.text ?? "") {
        units.push({
          offset: charOffset,
          size: char.length,
          key: char,
          kind: charKind(char),
          marks: node.marks,
        });
        charOffset += char.length;
      }
    } else {
      units.push({
        offset,
        size: node.nodeSize,
        key: `\u0000${JSON.stringify(node.mark([]).toJSON())}`,
        kind: "other",
        marks: node.marks,
      });
    }
  });
  return units;
}

/** Marks that BlockNote JSON does not contain (for example comments). The steps never remove them. */
function isIgnored(mark: Mark): boolean {
  return mark.type.spec.blocknoteIgnore === true;
}

/**
 * Adds the steps that change the inline content at `start` (the content of
 * `current`) to `target`. The steps change only what is different:
 *
 * - A `ReplaceStep` for each run of characters or nodes that changed.
 * - An `AddMarkStep` or `RemoveMarkStep` for each run of equal characters
 *   with different marks.
 *
 * Thus, the steps keep the text that did not change, with its marks that the
 * target does not contain (for example comments). A collaboration binding
 * then sees only the small changes.
 *
 * Method: our own design, built on the alignment of `alignText`.
 *
 * @internal
 */
export function addInlineContentSteps(
  tr: Transform,
  start: number,
  current: Node,
  target: Fragment,
) {
  const a = unitsOf(current.content);
  const b = unitsOf(target);
  // The alignment of the merge. Thus, a changed word is one change.
  const pairs = alignText(a, b);
  // Mark steps do not move positions. Thus, add them first.
  addMarkSteps(tr, start, a, b, pairs);
  addReplaceSteps(tr, start, current, target, a, b, pairs);
}

/**
 * Adds an `AddMarkStep` or a `RemoveMarkStep` for each run of matched units
 * with different marks. Adjacent changes of the same mark become one step.
 * A mark that BlockNote JSON does not contain stays (see {@link isIgnored}).
 */
function addMarkSteps(
  tr: Transform,
  start: number,
  a: readonly Unit[],
  b: readonly Unit[],
  pairs: readonly MatchedPair[],
) {
  const markChanges: { add: boolean; mark: Mark; from: number; to: number }[] =
    [];
  function changeMark(add: boolean, mark: Mark, from: number, to: number) {
    const last = markChanges.findLast(
      (change) =>
        change.add === add && change.to === from && change.mark.eq(mark),
    );
    if (last) {
      last.to = to;
    } else {
      markChanges.push({ add, mark, from, to });
    }
  }
  for (const { aIndex, bIndex } of pairs) {
    const unit = a[aIndex];
    const from = start + unit.offset;
    const to = from + unit.size;
    for (const mark of unit.marks) {
      if (!isIgnored(mark) && !mark.isInSet(b[bIndex].marks)) {
        changeMark(false, mark, from, to);
      }
    }
    for (const mark of b[bIndex].marks) {
      if (!mark.isInSet(unit.marks)) {
        changeMark(true, mark, from, to);
      }
    }
  }
  for (const { add, mark, from, to } of markChanges) {
    if (add) {
      tr.addMark(from, to, mark);
    } else {
      tr.removeMark(from, to, mark);
    }
  }
}

/**
 * Adds a `ReplaceStep` for each run of units that changed (or for each group
 * of near runs, see {@link joinNearRuns}), from the end. Thus, the positions
 * of the runs before each run do not move.
 */
function addReplaceSteps(
  tr: Transform,
  start: number,
  current: Node,
  target: Fragment,
  a: readonly Unit[],
  b: readonly Unit[],
  pairs: readonly MatchedPair[],
) {
  const runs: Run[] = gaps(pairs, a.length, b.length).filter(isChanged);
  const size = current.content.size;
  for (const parts of joinNearRuns(runs).reverse()) {
    // A joined run: the changed parts from the target, and the unchanged
    // text between them from the document (with its marks, for example
    // comments, and after the mark steps).
    let content = Fragment.empty;
    parts.forEach((part, k) => {
      if (k > 0) {
        content = content.append(
          tr.doc.slice(
            start + offsetOf(a, parts[k - 1].aEnd, size),
            start + offsetOf(a, part.aStart, size),
          ).content,
        );
      }
      content = content.append(
        target.cut(
          offsetOf(b, part.bStart, target.size),
          offsetOf(b, part.bEnd, target.size),
        ),
      );
    });
    tr.replace(
      start + offsetOf(a, parts[0].aStart, size),
      start + offsetOf(a, parts[parts.length - 1].aEnd, size),
      new Slice(content, 0, 0),
    );
  }
}

/**
 * The maximum number of replace steps for the content of one block. A
 * transaction keeps the document after each step, and each step in one text
 * copies that text. Thus, many steps in a long text use much memory (for
 * example a rename on each of 15,000 lines of a code block: 4 GB).
 */
const MAX_RUNS = 200;

type Run = { aStart: number; aEnd: number; bStart: number; bEnd: number };

/**
 * Returns the runs in groups, at most {@link MAX_RUNS} groups: the runs with
 * the shortest unchanged parts between them join. One step then replaces a
 * group, and it writes the unchanged parts between the runs again, with
 * their marks. Only a large change of one block has more runs.
 */
function joinNearRuns(runs: readonly Run[]): Run[][] {
  if (runs.length <= MAX_RUNS) {
    return runs.map((run) => [run]);
  }
  // The length of the unchanged part before each run (after the first run).
  const unchanged = runs.slice(1).map((run, k) => run.aStart - runs[k].aEnd);
  // Join each unchanged part that is at most this long. Then at most
  // MAX_RUNS groups stay.
  const limit = [...unchanged].sort((x, y) => x - y)[
    runs.length - MAX_RUNS - 1
  ];
  const groups: Run[][] = [[runs[0]]];
  runs.slice(1).forEach((run, k) => {
    if (unchanged[k] <= limit) {
      groups[groups.length - 1].push(run);
    } else {
      groups.push([run]);
    }
  });
  return groups;
}

/** The offset of the unit at `index`, or `size` after the last unit. */
function offsetOf(units: readonly Unit[], index: number, size: number): number {
  return index < units.length ? units[index].offset : size;
}
