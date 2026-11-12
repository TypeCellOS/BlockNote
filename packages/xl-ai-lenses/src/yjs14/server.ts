// The Yjs 14 mode of the document agent on a host
// (`@blocknote/xl-ai/yjs14/server`): the document of the agent, and the
// sessions. It has no React code. The host needs a DOM (a browser, or jsdom
// on a server), because the binding of Yjs 14 works in the view of an
// editor.

export {
  createSuggestionReview,
  type DecisionResult,
  type ReviewedToolCall,
  type SuggestionReview,
} from "./review.js";
export {
  createSuggestionDocument,
  keepSuggestionCurrent,
  type SuggestionDocument,
} from "./suggestionDocument.js";
export {
  createSuggestionSessionHost,
  type OpenedSuggestion,
  type SuggestionSessionHost,
  type SuggestionSessionHostOptions,
  type SuggestionSessionSnapshot,
} from "./suggestionSessions.js";
export {
  TOOL_CALLS_TYPE,
  type ToolCallIds,
  type ToolCallRecord,
  toolCallRecordsOf,
} from "./toolCallRecords.js";
