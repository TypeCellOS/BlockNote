import type { Fragment, Mark, Node } from "prosemirror-model";
import { Slice } from "prosemirror-model";
import type { Transform } from "prosemirror-transform";

import { myersMatch } from "../diff/myers.js";
import type { MatchedPair } from "../diff/types.js";

/**
 * The minimum length of a run of equal units between two changes. A shorter
 * run is part of the change. Thus, a changed word is one change, not a change
 * of each part between equal letters.
 */
const MIN_EQUAL_RUN = 3;

/**
 * One unit of inline content in ProseMirror: a character (a code point, thus
 * never half of a surrogate pair) or an inline node that is not text.
 */
type Unit = {
  /** The offset from the start of the content. */
  offset: number;
  size: number;
  /** Equal keys have equal text or nodes. The key does not include marks. */
  key: string;
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
          marks: node.marks,
        });
        charOffset += char.length;
      }
    } else {
      units.push({
        offset,
        size: node.nodeSize,
        key: `\u0000${JSON.stringify(node.mark([]).toJSON())}`,
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
 */
export function addInlineContentSteps(
  tr: Transform,
  start: number,
  current: Node,
  target: Fragment,
) {
  const a = unitsOf(current.content);
  const b = unitsOf(target);
  const pairs = withoutShortRuns(
    myersMatch(a, b, (x, y) => x.key === y.key),
    a.length,
    b.length,
  );

  // Mark steps do not move positions. Thus, add them first. Adjacent changes
  // of the same mark become one step.
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

  // Replace the changed runs, from the end. Thus, the positions of the runs
  // before each run do not move.
  const runs: { aStart: number; aEnd: number; bStart: number; bEnd: number }[] =
    [];
  let aNext = 0;
  let bNext = 0;
  for (const pair of [...pairs, { aIndex: a.length, bIndex: b.length }]) {
    if (pair.aIndex > aNext || pair.bIndex > bNext) {
      runs.push({
        aStart: aNext,
        aEnd: pair.aIndex,
        bStart: bNext,
        bEnd: pair.bIndex,
      });
    }
    aNext = pair.aIndex + 1;
    bNext = pair.bIndex + 1;
  }

  for (const run of runs.reverse()) {
    const from = start + offsetOf(a, run.aStart, current.content.size);
    const to = start + offsetOf(a, run.aEnd, current.content.size);
    const slice = new Slice(
      target.cut(
        offsetOf(b, run.bStart, target.size),
        offsetOf(b, run.bEnd, target.size),
      ),
      0,
      0,
    );
    tr.replace(from, to, slice);
  }
}

/**
 * Removes the runs of matched pairs that are shorter than
 * {@link MIN_EQUAL_RUN} and have a change on the two sides. Runs at the start
 * or the end of the content stay.
 */
function withoutShortRuns(
  pairs: readonly MatchedPair[],
  aLength: number,
  bLength: number,
): MatchedPair[] {
  const runs: MatchedPair[][] = [];
  for (const pair of pairs) {
    const run = runs.at(-1);
    const last = run?.at(-1);
    if (
      run !== undefined &&
      last !== undefined &&
      pair.aIndex === last.aIndex + 1 &&
      pair.bIndex === last.bIndex + 1
    ) {
      run.push(pair);
    } else {
      runs.push([pair]);
    }
  }
  return runs
    .filter((run) => {
      const first = run[0];
      const last = run[run.length - 1];
      const atStart = first.aIndex === 0 && first.bIndex === 0;
      const atEnd = last.aIndex === aLength - 1 && last.bIndex === bLength - 1;
      return run.length >= MIN_EQUAL_RUN || atStart || atEnd;
    })
    .flat();
}

/** The offset of the unit at `index`, or `size` after the last unit. */
function offsetOf(units: Unit[], index: number, size: number): number {
  return index < units.length ? units[index].offset : size;
}
