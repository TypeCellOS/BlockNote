// The document agent in an editor: the extension, the transports, and the
// React components of the review.

export {
  type AgentExtensionOptions,
  type AgentState,
  type ClientMode,
  createAgentExtension,
  DOCUMENT_AGENT_KEY,
  type DocumentAgent,
  documentAgentOf,
  type ModeContext,
  type ReviewData,
  type ReviewedToolCall,
  type ReviewOf,
} from "./agentExtension.js";
export {
  type AcceptClaim,
  DocumentAgentExtension,
  type DocumentAgentExtensionOptions,
  type DocumentAgentState,
  type ProposalReviewData,
  type Review,
  type ReviewToolCall,
} from "./DocumentAgentExtension.js";
export {
  DocumentAgentMenu,
  documentAgentMenuItems,
} from "./DocumentAgentMenu.js";
export { DocumentAgentReview } from "./DocumentAgentReview.js";
export {
  assertNoSuggestions,
  clearSuggestions,
  hasSuggestions,
  mainDocumentOf,
  showSuggestions,
} from "./suggestions.js";
export {
  createInProcessTransport,
  type DocumentAgentRequestBody,
  observeTransport,
} from "./transport.js";
