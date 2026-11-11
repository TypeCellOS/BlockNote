// The document agent: an agent loop that edits a document through the text
// lens (`api/v2`). This file has the code that runs on each host: in the
// browser and on a server. The code for the editor (React, the extension)
// is in `client/index.ts`.

export {
  createDocumentAgent,
  type DocumentAgentOptions,
  type DocumentAgentRequest,
  type DocumentAgentRun,
  runDocumentAgent,
  streamDocumentAgent,
  streamDocumentAgentOnHandle,
} from "./agent/documentAgent.js";
export {
  DOCUMENT_BATCHES_CHUNK,
  DOCUMENT_PROPOSAL_CHUNK,
  type DocumentBatchesData,
  type DocumentProposalData,
  type LanguageModelObject,
} from "./agent/earlyToolCalls.js";
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
  type BatchResult,
  type CreateEditor,
  createProposal,
  forkPointOf,
  headlessEditorFactory,
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
  type EditOutput,
  editText,
  readDocument,
  type ReadOutput,
  type ToolNote,
  writeDocument,
  type WriteInput,
  type WriteOutput,
} from "./tools/documentTools.js";
export {
  createDocumentHandle,
  type DocumentHandle,
  type ProposalStep,
  type StepOutcome,
} from "./tools/handle.js";
export {
  createToolCalls,
  type DocumentToolName,
  type DocumentToolTypes,
  type OnBatches,
  type ToolCalls,
} from "./tools/toolCalls.js";
