import { SuggestionsExtension, yDocToBlocks } from "@blocknote/core/y";
import * as Y from "@y/y";
import type { Mark, Node } from "prosemirror-model";

import {
  type AgentExtensionOptions,
  type ClientMode,
  createAgentExtension,
  type ModeContext,
  type ReviewedToolCall,
} from "../client/agentExtension.js";
import {
  createReplayPlugin,
  type ReplayChange,
} from "../client/replayAnimation.js";
import { createSuggestionReview } from "./review.js";
import {
  hasToolCallRecord,
  toolCallIdsOf,
  watchToolCallAttributions,
} from "./toolCallRecords.js";

// The Yjs 14 mode of the document agent in an editor. The chat, the runs
// and the states are the shared code of `client/agentExtension.ts`. This
// file has the review of this mode.
//
// The changes of the agent are in the suggestion document, and the binding
// of core shows them. Thus, this mode has no copy of the changes, no display
// of its own, and no lock of the editor: a user can type during a run and
// a review.

/** The data of a review in Yjs 14 mode: the tool calls of the suggestion document. */
export type SuggestionReviewData = { toolCalls: ReviewedToolCall[] };

export type SuggestionAgentExtensionOptions = AgentExtensionOptions & {
  /** The replica of the main document of this editor. */
  main: Y.Doc;
  /** The replica of the suggestion document of this editor. */
  suggestion: Y.Doc;
  /** The name of the type of the document content in the two Y.Docs. */
  fragment: string;
};

/**
 * The options of `withCollaboration` (`@blocknote/core/y`) for an editor
 * that shows the changes of the agent as suggestions: the editor is bound
 * to the main document, with the suggestion document on it. The author of
 * each suggestion is the ID of its tool call.
 *
 * Call `destroy` when the editor goes.
 */
export function createSuggestionCollaboration(options: {
  main: Y.Doc;
  suggestion: Y.Doc;
  fragment: string;
}) {
  // The attributions before the renderer (see `watchToolCallAttributions`).
  const watch = watchToolCallAttributions(options.suggestion);
  const renderer = Y.createDiffRenderer(options.main, options.suggestion, {
    attributions: watch.attributions,
  });
  // A change of the user in the editor is a change of the main document,
  // not a suggestion.
  renderer.suggestionMode = false;
  return {
    collaboration: {
      fragment: options.main.get(options.fragment),
      suggestionDoc: options.suggestion,
      renderer,
    },
    destroy() {
      watch.destroy();
      renderer.destroy();
    },
  };
}

/**
 * The document agent in an editor, in Yjs 14 mode. The editor must be made
 * with the options of {@link createSuggestionCollaboration}.
 */
export const SuggestionAgentExtension =
  createAgentExtension(createSuggestionMode);

/** The kind of change that each suggestion mark of the Yjs 14 binding shows. */
const SUGGESTION_KINDS: Record<string, ReplayChange["kind"] | undefined> = {
  "y-attributed-insert": "insert",
  "y-attributed-delete": "delete",
  "y-attributed-format": "modify",
  "y-attributed-attrs": "modify",
};

function stringsOf(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

/**
 * The authors of the change that a suggestion mark of the Yjs 14 binding
 * shows on a node. The author of a suggestion of the agent is the ID of a
 * tool call (see `watchToolCallAttributions`).
 */
function authorsOf(mark: Mark, node: Node): string[] {
  if (mark.type.name !== "y-attributed-attrs") {
    return stringsOf(mark.attrs.userIds);
  }
  // This mark has the authors of each changed attribute.
  const changes: unknown = mark.attrs.changes;
  if (typeof changes !== "object" || changes === null) {
    return [];
  }
  return Object.entries(changes).flatMap(([name, change]: [string, unknown]) =>
    // The editor does not show a change of the ID of a block.
    name === "id" && !node.isInline
      ? []
      : stringsOf((change as { userIds?: unknown } | null)?.userIds),
  );
}

/** The review of the Yjs 14 mode in an editor (see `ClientMode`). */
function createSuggestionMode(
  context: ModeContext<SuggestionReviewData>,
  options: SuggestionAgentExtensionOptions | undefined,
): ClientMode<SuggestionReviewData, object> {
  if (options === undefined) {
    throw new Error("The document agent in Yjs 14 mode needs its documents");
  }
  const { main, suggestion, fragment } = options;
  const { editor, store, reset, record } = context;
  const review = createSuggestionReview({ main, suggestion });

  /**
   * The tool calls that the suggestion document had at the start of the
   * run in progress, and those whose replay animation is complete.
   * `undefined` if no run is in progress.
   */
  let shown: Set<string> | undefined;
  /** The tool calls that arrived in a run, and whose replay animation is not complete. */
  const fresh = new Set<string>();

  /**
   * True if the replay animation shows the changes of the tool call. A tool
   * call is new if it arrives during a run that this editor started or
   * follows. A tool call that arrives at a different time (with the
   * document at the start, or from a run that this editor does not follow)
   * shows at once.
   */
  function isNew(id: string): boolean {
    if (fresh.has(id)) {
      return true;
    }
    if (
      shown === undefined ||
      shown.has(id) ||
      !hasToolCallRecord(suggestion, id)
    ) {
      return false;
    }
    fresh.add(id);
    return true;
  }

  /** The change that a node shows, if it is a change of a new tool call. */
  function changeOf(node: Node): ReplayChange | undefined {
    let modified: ReplayChange | undefined;
    for (const mark of node.marks) {
      const kind = SUGGESTION_KINDS[mark.type.name];
      const key =
        kind === undefined ? undefined : authorsOf(mark, node).find(isNew);
      if (kind === undefined || key === undefined) {
        continue;
      }
      if (kind !== "modify") {
        // A new node and a removed node show as such, also if an
        // attribute of the node changed.
        return { kind, key };
      }
      modified ??= { kind, key };
    }
    return modified;
  }

  const replay = createReplayPlugin({
    changeOf,
    onComplete(keys) {
      for (const key of keys) {
        fresh.delete(key);
        shown?.add(key);
      }
    },
  });

  /**
   * Makes the state agree with the tool calls of the suggestion document.
   * The tool calls change without this editor: a run that a different
   * client started adds some, and a different user decides on some.
   */
  function sync() {
    const toolCalls = review.toolCalls();
    // The decisions of each user go into the chat of this editor: a card
    // of a tool call shows the decision also if a different user made it.
    for (const call of toolCalls) {
      if (call.state !== "open") {
        record([call.toolCallId], call.state);
      }
    }
    const open = toolCalls.some((call) => call.state === "open");
    const state = store.state;
    if (state.status === "idle") {
      if (open) {
        store.setState({
          status: "reviewing",
          review: { toolCalls, answer: "" },
        });
      }
    } else if (state.status === "reviewing" && !open) {
      reset();
    } else {
      store.setState({ ...state, review: { ...state.review, toolCalls } });
    }
  }

  /** Runs a decision of the user. The state and the chat follow the suggestion document. */
  function decide(run: () => void) {
    run();
    sync();
  }

  return {
    locksEditor: false,
    startReview: () => ({ toolCalls: review.toolCalls() }),
    // The replay animation shows the tool calls that arrive from here.
    beginRun() {
      shown = new Set(toolCallIdsOf(suggestion));
    },
    endRun() {
      // The animation of the tool calls that arrived continues to its end.
      shown = undefined;
      // A run can end without a change: then there is no review.
      sync();
    },
    // The suggestions are in the suggestion document: nothing to hide.
    hide: () => undefined,
    // The end of a review without a decision (for example the AI menu
    // closed) does not remove the suggestions: the review continues.
    afterReset: sync,
    mainDocument: () => yDocToBlocks(editor, main, fragment),
    acceptAll: () => decide(() => review.acceptAll()),
    rejectAll: () => decide(() => review.rejectAll()),
    acceptToolCall: (toolCallId) =>
      decide(() => review.acceptToolCall(toolCallId)),
    rejectToolCall: (toolCallId) =>
      decide(() => review.rejectToolCall(toolCallId)),
    // The binding of core shows each suggestion in an `ins` or a `del`
    // element, with the IDs of its authors as JSON in `data-user-ids`.
    suggestionSelector(toolCallId) {
      const id = JSON.stringify(toolCallId).replace(/["\\]/g, "\\$&");
      return `ins[data-user-ids*="${id}"], del[data-user-ids*="${id}"]`;
    },
    toolCallOfElement(element) {
      const authors: unknown = JSON.parse(
        element.closest<HTMLElement>("ins, del")?.dataset.userIds ?? "[]",
      );
      const known = new Set(review.toolCalls().map((call) => call.toolCallId));
      return Array.isArray(authors)
        ? authors.find(
            (author): author is string =>
              typeof author === "string" && known.has(author),
          )
        : undefined;
    },
    prosemirrorPlugins:
      options.replayAnimation === false ? [] : [replay.plugin],
    mount() {
      const unsubscribe = review.subscribe(sync);
      // The editor shows the suggestions on the main document.
      editor.getExtension(SuggestionsExtension)?.viewSuggestions();
      sync();
      return unsubscribe;
    },
    api: {},
  };
}
