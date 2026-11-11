// The document agent: an agent loop that edits a document through the text
// lens (`api/v2`). This file has the code that runs on each host: in the
// browser and on a server. The code for the editor (React, the extension)
// is in `client/index.ts`.

export {
  createDocumentAgent,
  type DocumentAgentOptions,
  type DocumentAgentRun,
  runDocumentAgent,
  streamAgentOnDocument,
} from "./agent/documentAgent.js";
export { type LanguageModelObject } from "./agent/earlyToolCalls.js";
export {
  batchesChunk,
  DOCUMENT_BATCHES_CHUNK,
  DOCUMENT_PROPOSAL_CHUNK,
  type DocumentBatchesData,
  type DocumentProposalData,
} from "./proposal/chunks.js";
export {
  createProposalDocument,
  type ProposalDocument,
  type ProposalExtra,
} from "./proposal/proposalDocument.js";
export {
  type DocumentAgentRequest,
  streamDocumentAgent,
} from "./proposal/streamProposalAgent.js";
export { recordReview } from "./agent/chatReview.js";
export { DOCUMENT_AGENT_INSTRUCTIONS } from "./agent/instructions.js";
export {
  blockOf,
  type DerivedSuggestions,
  deriveSuggestions,
  suggestionIdOf,
  type ToolCallInfo,
  type ToolCallState,
  toolCallsOf,
  toolCallsOfBlocks,
  UNATTRIBUTED_SUGGESTION,
} from "./proposal/derive.js";
export { hashDocument } from "./proposal/hash.js";
export {
  batchFollows,
  type BatchResult,
  type CreateEditor,
  createProposal,
  forkPointOf,
  headlessEditorFactory,
  isProposalShape,
  type HeadlessEditorOptions,
  openProposal,
  replayProposal,
  type ReplayResult,
  withBatch,
  writeBatch,
} from "./proposal/proposal.js";
export { rebaseProposal } from "./proposal/rebase.js";
export {
  acceptAllChange,
  acceptToolCall,
  type ReviewResult,
  revertToolCall,
  toolCallBatch,
} from "./proposal/review.js";
export type { Batch, BatchSource, Proposal } from "./proposal/types.js";
export {
  createInMemoryDocumentStore,
  type DocumentSource,
  type InMemoryDocumentStore,
} from "./stores/documentSource.js";
export { createRunLog, type RunLog } from "./sessions/runLog.js";
export {
  createSessionHost,
  type RunOrigin,
  type SessionHost,
  type SessionHostOptions,
  type SessionMessageMetadata,
  type SessionSnapshot,
} from "./sessions/sessionHost.js";
export {
  assertNoYjsSuggestions,
  SUGGESTION_MARK_NAMES,
  yFragmentHasSuggestions,
} from "./stores/yjsGuard.js";
export {
  createInMemoryProposalStore,
  type InMemoryProposalStore,
  type ProposalStore,
} from "./stores/proposalStore.js";
export { createDocumentTools, type DocumentTools } from "./tools/aiSdkTools.js";
export {
  describeOpening,
  describeRead,
  describeWrite,
} from "./tools/describe.js";
export {
  type EditInput,
  type AnchorField,
  type EditOutput,
  editText,
  type RangeInput,
  readDocument,
  replaceRange,
  type ReadOutput,
  type ToolCallReview,
  type ToolNote,
  writeDocument,
  type WriteInput,
  type WriteOutput,
} from "./tools/documentTools.js";
export {
  type AgentDocument,
  type AgentToolCall,
  type OpenDocument,
  type WriteResult,
} from "./tools/agentDocument.js";
export {
  createToolCalls,
  type DocumentToolName,
  type DocumentToolTypes,
  type OnExtra,
  type ToolCalls,
} from "./tools/toolCalls.js";
