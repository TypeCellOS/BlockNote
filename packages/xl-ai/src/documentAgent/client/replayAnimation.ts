import type { Node } from "prosemirror-model";
import { Decoration, DecorationSet } from "prosemirror-view";

// The replay animation of the document agent: the new changes of a run
// show one after the other, and the text of each one shows from its start
// to its end. The document has the full change at once: the animation is
// only in the view. This file is the same for each mode. A mode tells which
// nodes are new.

/** The time of the replay animation for one character of inserted text. */
const MS_PER_CHARACTER = 12;

/** One part of the animation: a range of the document, and when it shows. */
export type ReplayStep = {
  from: number;
  to: number;
  /** True for a new block: it shows as a whole. False for a part of new text. */
  block: boolean;
  /** The time from the start of the animation to the start of this part. */
  delay: number;
  duration: number;
};

/**
 * The parts of the replay animation for the new nodes of a document, in
 * the sequence of the document. Each part starts when the part before it
 * is complete.
 *
 * New text has one part for each word. The reason: the browser clips an
 * element on more than one line to the box of its first line. One part for
 * the full text would show only the text on its first line. A word is on
 * one line.
 */
export function replaySteps(
  doc: Node,
  isNew: (node: Node) => boolean,
): ReplayStep[] {
  const steps: ReplayStep[] = [];
  let delay = 0;
  function add(from: number, to: number, block: boolean, duration: number) {
    steps.push({ from, to, block, delay, duration });
    delay += duration;
  }
  doc.descendants((node, pos) => {
    if (!isNew(node)) {
      return true;
    }
    if (!node.isInline) {
      add(pos, pos + node.nodeSize, true, 300);
      // The content of a new block shows with the block.
      return false;
    }
    const duration = Math.min(
      1500,
      Math.max(150, node.nodeSize * MS_PER_CHARACTER),
    );
    const text = node.text;
    if (text === undefined) {
      // Inline content that is not text, for example a mention.
      add(pos, pos + node.nodeSize, false, duration);
      return true;
    }
    // A word, with the space after it.
    for (const word of text.matchAll(/\S+\s*|\s+/g)) {
      const from = pos + word.index;
      add(
        from,
        from + word[0].length,
        false,
        (duration * word[0].length) / text.length,
      );
    }
    return true;
  });
  return steps;
}

/** The decorations of the replay animation for the new nodes of a document. */
export function replayDecorations(
  doc: Node,
  isNew: (node: Node) => boolean,
): DecorationSet {
  return DecorationSet.create(
    doc,
    replaySteps(doc, isNew).map(({ from, to, block, delay, duration }) => {
      const attrs = {
        class: block ? "bn-agent-new-block" : "bn-agent-new",
        style: `--bn-agent-delay: ${Math.round(delay)}ms; --bn-agent-duration: ${Math.round(duration)}ms`,
      };
      return block
        ? Decoration.node(from, to, attrs)
        : Decoration.inline(from, to, attrs);
    }),
  );
}
