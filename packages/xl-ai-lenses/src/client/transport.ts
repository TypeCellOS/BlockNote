import type { ChatTransport, UIMessage } from "ai";

import type { DocumentAgentOptions } from "../agent/documentAgent.js";
import {
  headlessEditorFactory,
  type HeadlessEditorOptions,
} from "../proposal/proposal.js";
import { streamDocumentAgent } from "../proposal/streamProposalAgent.js";
import type { Proposal } from "../proposal/types.js";

// The transport of the proposal mode for client mode. The function that
// observes a transport is in `observeTransport.ts`: each mode uses it.

export { observeTransport } from "./observeTransport.js";

/** The body of a request of the document agent in proposal mode, next to the chat messages. */
export type DocumentAgentRequestBody = { proposal: Proposal };

/**
 * The transport of client mode: the loop and the tools run in the browser,
 * with the same code as on a server (`streamDocumentAgent`). Only the LLM
 * calls leave the browser: give a model that sends its requests through a
 * proxy or a gateway, thus the API key stays on a server.
 */
export function createInProcessTransport(
  options: DocumentAgentOptions & HeadlessEditorOptions,
): ChatTransport<UIMessage> {
  const createEditor = headlessEditorFactory({ schema: options.schema });
  return {
    async sendMessages({ messages, body, abortSignal }) {
      const proposal = (body as Partial<DocumentAgentRequestBody> | undefined)
        ?.proposal;
      if (proposal === undefined) {
        throw new Error("The request of the document agent has no proposal");
      }
      return streamDocumentAgent(
        { messages, proposal },
        { ...options, createEditor, abortSignal },
      );
    },
    async reconnectToStream() {
      // The run is in this tab: there is no stream to connect to again.
      return null;
    },
  };
}
