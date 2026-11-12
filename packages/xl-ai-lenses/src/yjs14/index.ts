// The Yjs 14 mode of the document agent in an editor
// (`@blocknote/xl-ai-lenses/yjs14`). It needs `@y/y` and `@blocknote/core/y`. An
// app on Yjs 13 does not load this entry point.

export {
  createSuggestionReview,
  type DecisionResult,
  type ReviewedToolCall,
  type SuggestionReview,
} from "./review.js";
export {
  createSuggestionCollaboration,
  SuggestionAgentExtension,
  type SuggestionAgentExtensionOptions,
  type SuggestionReviewData,
} from "./suggestionAgentExtension.js";
export {
  TOOL_CALLS_TYPE,
  type ToolCallIds,
  type ToolCallRecord,
  toolCallRecordsOf,
  watchToolCallAttributions,
} from "./toolCallRecords.js";
