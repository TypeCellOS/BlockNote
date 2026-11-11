import { SuggestionsExtension, yDocToBlocks } from "@blocknote/core/y";
import * as Y from "@y/y";

import {
  type AgentExtensionOptions,
  type ClientMode,
  createAgentExtension,
  type ModeContext,
  type ReviewedToolCall,
} from "../client/agentExtension.js";
import { createSuggestionReview } from "./review.js";
import { watchToolCallAttributions } from "./toolCallRecords.js";

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
    // A run can end without a change: then there is no review.
    endRun: sync,
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
