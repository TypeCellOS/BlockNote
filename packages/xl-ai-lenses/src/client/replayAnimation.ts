import type { Node } from "prosemirror-model";
import { Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";

// The replay animation of the document agent. The changes of a run show
// one after the other, in the sequence of the document, as the changes of
// a person who edits the document: removed text gets its strike-through
// word by word, new text shows word by word, a new block appears and its
// text shows word by word, and a block with a new type or a new prop gets
// a short highlight.
//
// The document has the full change of a tool call at once: the animation
// is only in the view. Each part of a change has a state that depends only
// on the time: `pending` (not yet reached), `active`, or `done`. A
// decoration gives the state to the style sheet. New text that is pending
// is not there for the layout: the text after it moves when a word shows,
// as when a person types.
//
// The time is not in the style sheet (no `animation-delay` for the
// sequence). The reason: ProseMirror makes an element again when the
// content near it changes, and it changes the style of an element in
// place when a decoration changes. A CSS animation starts again in the
// first case, and it continues with the new delay in the second case. No
// delay is correct for the two cases.
//
// This file is the same for each mode. A mode tells which nodes are a new
// change, and of which tool call.

/** A change that a node shows, and the tool call that made it. */
export type ReplayChange = {
  kind: "insert" | "delete" | "modify";
  /** The tool call of the change. The changes of one call are one group. */
  key: string;
};

/** What a part of the animation shows. The CSS class is `bn-agent-<kind>`. */
export type ReplayKind =
  /** A word of new text, or new inline content that is not text. */
  | "new"
  /** A new block. Its content has its own parts. */
  | "new-block"
  /** A word of removed text, or removed inline content that is not text. */
  | "removed"
  /** A removed block. */
  | "removed-block"
  /** Text with a new format. */
  | "changed"
  /** A block with a new type or a new prop. */
  | "changed-block";

/** The state of a part at a time. The CSS class is `bn-agent-<state>`. */
export type ReplayState = "pending" | "active" | "done";

/** One part of the animation: a range of the document, and how long it takes. */
export type ReplayPart = {
  from: number;
  to: number;
  kind: ReplayKind;
  key: string;
  /** The time from the start of the group of its tool call to the start of this part. */
  delay: number;
  duration: number;
};

/** The times of the animation, in milliseconds. */
const TIMES = {
  /** One character of new text: about 70 characters in a second. */
  typedCharacter: 14,
  /** One character of removed text. A person removes text faster than he writes it. */
  removedCharacter: 5,
  /** Inline content that is not text, for example a mention. */
  inlineNode: 60,
  newBlock: 120,
  removedBlock: 300,
  changed: 400,
  /** The time to go to a different block. */
  move: 150,
  /** The longest time for the changes of one tool call. A longer group runs faster. */
  group: 6000,
  /** The shortest time between two updates of the view. */
  tick: 16,
};

/**
 * The parts of the replay animation for the new changes of a document, in
 * the sequence of the document. Each part of a tool call starts when the
 * part before it is complete.
 */
export function replayParts(
  doc: Node,
  changeOf: (node: Node) => ReplayChange | undefined,
): ReplayPart[] {
  const parts: ReplayPart[] = [];
  /** The end of the last part of each tool call. */
  const ends = new Map<string, number>();
  /** The parent of the last text part of each tool call: a different parent is a move. */
  const places = new Map<string, Node | null>();

  function add(
    from: number,
    to: number,
    kind: ReplayKind,
    key: string,
    duration: number,
    place: Node | null,
  ) {
    let delay = ends.get(key) ?? 0;
    if (places.has(key) && places.get(key) !== place) {
      delay += TIMES.move;
    }
    places.set(key, place);
    parts.push({ from, to, kind, key, delay, duration });
    ends.set(key, delay + duration);
  }

  /** One part for each word of a text node, and one part for other inline content. */
  function addInline(
    node: Node,
    pos: number,
    kind: "new" | "removed",
    key: string,
    place: Node | null,
  ) {
    if (!node.isText) {
      add(pos, pos + node.nodeSize, kind, key, TIMES.inlineNode, place);
      return;
    }
    const perCharacter =
      kind === "removed" ? TIMES.removedCharacter : TIMES.typedCharacter;
    // A word, with the space after it.
    for (const word of (node.text ?? "").matchAll(/\S+\s*|\s+/g)) {
      const from = pos + word.index;
      add(
        from,
        from + word[0].length,
        kind,
        key,
        word[0].length * perCharacter,
        place,
      );
    }
  }

  /**
   * A new block appears, then its content shows part by part. A new block
   * in it (a nested block) appears in its turn, not with its parent.
   */
  function addNewBlock(node: Node, pos: number, key: string) {
    add(pos, pos + node.nodeSize, "new-block", key, TIMES.newBlock, node);
    // The first part of the content is in this block: it needs no time to
    // go there.
    places.delete(key);
    node.descendants((child, offset, parent) => {
      const childPos = pos + 1 + offset;
      if (child.isInline) {
        addInline(child, childPos, "new", key, parent);
        return false;
      }
      if (child.type === node.type) {
        addNewBlock(child, childPos, key);
        return false;
      }
      return true;
    });
  }

  doc.descendants((node, pos, parent) => {
    const change = changeOf(node);
    if (change === undefined) {
      return true;
    }
    const { kind, key } = change;
    if (node.isInline) {
      if (kind === "modify") {
        add(pos, pos + node.nodeSize, "changed", key, TIMES.changed, parent);
      } else {
        addInline(
          node,
          pos,
          kind === "insert" ? "new" : "removed",
          key,
          parent,
        );
      }
      return false;
    }
    if (kind === "modify") {
      add(pos, pos + node.nodeSize, "changed-block", key, TIMES.changed, node);
      // A change in the block has its own parts. The first one is in this
      // block: it needs no time to go there.
      places.delete(key);
      return true;
    }
    if (kind === "delete") {
      add(
        pos,
        pos + node.nodeSize,
        "removed-block",
        key,
        TIMES.removedBlock,
        node,
      );
    } else {
      addNewBlock(node, pos, key);
    }
    // The content of a new block and of a removed block is a part of it.
    return false;
  });

  // A long group runs faster.
  for (const [key, end] of ends) {
    if (end > TIMES.group) {
      const scale = TIMES.group / end;
      for (const part of parts) {
        if (part.key === key) {
          part.delay *= scale;
          part.duration *= scale;
        }
      }
    }
  }
  return parts;
}

/** The parts of the animation at a time. */
export type ReplayFrame = {
  parts: (ReplayPart & { state: ReplayState })[];
  /** The time of the next change of the state of a part, if there is one. */
  next: number | undefined;
  /** True if each change is complete. */
  complete: boolean;
};

/**
 * The clock of the replay animation of one editor. The changes of a tool
 * call start when the changes of the tool call before it are complete:
 * the editor shows one change at a time, also if two tool calls arrive at
 * about the same time.
 */
export function createReplayTimeline(now: () => number = () => Date.now()) {
  /** The time at which the changes of each tool call start. */
  const starts = new Map<string, number>();
  /** The end of the last group. */
  let end = 0;

  return {
    /** The parts for the new changes of the document, with their states at this time. */
    frame(
      doc: Node,
      changeOf: (node: Node) => ReplayChange | undefined,
    ): ReplayFrame {
      const parts = replayParts(doc, changeOf);
      const time = now();
      // The parts are in the sequence of the document. A tool call that
      // is new for this clock starts after the last group.
      const lengths = new Map<string, number>();
      for (const part of parts) {
        lengths.set(
          part.key,
          Math.max(lengths.get(part.key) ?? 0, part.delay + part.duration),
        );
      }
      for (const [key, length] of lengths) {
        let start = starts.get(key);
        if (start === undefined) {
          start = Math.max(time, end);
          starts.set(key, start);
        }
        end = Math.max(end, start + length);
      }

      let next: number | undefined;
      const frame = parts.map((part) => {
        const start = (starts.get(part.key) ?? time) + part.delay;
        const partEnd = start + part.duration;
        const state: ReplayState =
          time < start ? "pending" : time < partEnd ? "active" : "done";
        const change =
          state === "pending"
            ? start
            : state === "active"
              ? partEnd
              : undefined;
        if (change !== undefined && (next === undefined || change < next)) {
          next = change;
        }
        return { ...part, state };
      });
      return { parts: frame, next, complete: time >= end };
    },
    /** The tool calls that this clock started. */
    keys: () => [...starts.keys()],
    /** Forgets the tool calls: the next changes start a new sequence. */
    reset() {
      starts.clear();
      end = 0;
    },
  };
}

/** The decorations of a frame. Adjacent parts of text with the same state are one decoration. */
function decorationsOf(doc: Node, frame: ReplayFrame): DecorationSet {
  const decorations: Decoration[] = [];
  let last: (ReplayPart & { state: ReplayState }) | undefined;
  let from = 0;

  function flush(to: number) {
    if (last !== undefined) {
      decorations.push(
        Decoration.inline(from, to, {
          class: `bn-agent-${last.kind} bn-agent-${last.state}`,
        }),
      );
    }
  }

  for (const part of frame.parts) {
    if (part.kind.endsWith("-block")) {
      decorations.push(
        Decoration.node(part.from, part.to, {
          class: `bn-agent-${part.kind} bn-agent-${part.state}`,
        }),
      );
      continue;
    }
    if (
      last !== undefined &&
      last.to === part.from &&
      last.kind === part.kind &&
      last.state === part.state &&
      last.key === part.key
    ) {
      last = part;
      continue;
    }
    flush(last?.to ?? 0);
    last = part;
    from = part.from;
  }
  flush(last?.to ?? 0);
  return DecorationSet.create(doc, decorations);
}

/** True if the user asked the system for less motion: then the changes show at once. */
function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * The replay animation as a ProseMirror plugin: it gives each new change
 * of the document its decoration, and updates the view when the state of a
 * part changes.
 *
 * `changeOf` tells which nodes show a new change. A change can become new
 * only together with a change of the document: the plugin examines a
 * document one time if it has no new change.
 */
export function createReplayPlugin(options: {
  changeOf: (node: Node) => ReplayChange | undefined;
  /**
   * Called when the animation is complete, with the tool calls that it
   * showed. After the call, `changeOf` must not tell that the changes of
   * these tool calls are new.
   */
  onComplete: (keys: string[]) => void;
  now?: () => number;
}) {
  const now = options.now ?? (() => Date.now());
  const timeline = createReplayTimeline(now);
  /** A document that the plugin examined, and that has no new change. */
  let idle: Node | undefined;
  /** The time of the next change of the state of a part. */
  let next: number | undefined;

  function decorations(doc: Node): DecorationSet | null {
    if (doc === idle || prefersReducedMotion()) {
      return null;
    }
    const frame = timeline.frame(doc, options.changeOf);
    if (frame.complete) {
      const keys = timeline.keys();
      timeline.reset();
      idle = doc;
      next = undefined;
      if (keys.length > 0) {
        options.onComplete(keys);
      }
      return null;
    }
    next = frame.next;
    return decorationsOf(doc, frame);
  }

  return {
    plugin: new Plugin({
      key: new PluginKey("blocknote-document-agent-replay"),
      props: { decorations: (state) => decorations(state.doc) },
      view(view) {
        let timer: ReturnType<typeof setTimeout> | undefined;
        /** Updates the view again at the next change of the state of a part. */
        function schedule() {
          clearTimeout(timer);
          timer = undefined;
          if (next !== undefined) {
            timer = setTimeout(
              () => {
                timer = undefined;
                // The same state: the view gets the decorations again.
                view.updateState(view.state);
              },
              Math.max(TIMES.tick, next - now()),
            );
          }
        }
        schedule();
        return { update: schedule, destroy: () => clearTimeout(timer) };
      },
    }),
    /** Stops the animation at once: the changes show as complete at the next update of the view. */
    stop() {
      timeline.reset();
      idle = undefined;
      next = undefined;
    },
  };
}
