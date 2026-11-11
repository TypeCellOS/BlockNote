import type { ChatTransport, UIMessage, UIMessageChunk } from "ai";

import {
  type DocumentAgentOptions,
  streamDocumentAgent,
} from "../agent/documentAgent.js";
import {
  headlessEditorFactory,
  type HeadlessEditorOptions,
} from "../proposal/proposal.js";
import type { Proposal } from "../proposal/types.js";

/** The body of a request of the document agent, next to the chat messages. */
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

/**
 * Wraps a transport: the listener sees each chunk of the UI message stream
 * before the chat does. The client uses it to apply the batches of each
 * tool output. It is the same for each transport.
 */
export function observeTransport(
  transport: ChatTransport<UIMessage>,
  onChunk: (chunk: UIMessageChunk) => void,
): ChatTransport<UIMessage> {
  return {
    async sendMessages(options) {
      const stream = await transport.sendMessages(options);
      return stream.pipeThrough(
        new TransformStream<UIMessageChunk, UIMessageChunk>({
          transform(chunk, controller) {
            onChunk(chunk);
            controller.enqueue(chunk);
          },
        }),
      );
    },
    reconnectToStream(options) {
      return transport.reconnectToStream(options);
    },
  };
}
