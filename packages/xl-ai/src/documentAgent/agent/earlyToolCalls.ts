import {
  type LanguageModel,
  type LanguageModelMiddleware,
  type UIMessageChunk,
  wrapLanguageModel,
} from "ai";

import type { Batch, Proposal } from "../proposal/types.js";
import {
  isDocumentToolName,
  type OnBatches,
  type ToolCalls,
} from "../tools/toolCalls.js";

/** A model of the AI SDK as an object, not as the ID of a gateway model. */
export type LanguageModelObject = Exclude<LanguageModel, string>;

/**
 * Returns the model with a middleware that starts each document tool call
 * when the model has written that call completely.
 *
 * The reason: the loop of the AI SDK (`streamText`, version 7) runs the
 * tools of an LLM step only when the model call ends. Without this
 * middleware, all changes of one step reach the editor together, at the
 * end of the step. With it, the first change shows while the model still
 * writes the next tool call. This is not partial tool-call streaming: a
 * call starts only when its input is complete.
 *
 * The middleware works on the stream of a model. A call without a stream
 * (`generate`) has all tool calls at the same time, thus there is nothing
 * to start early.
 */
export function withEarlyToolCalls(
  model: LanguageModelObject,
  calls: ToolCalls,
) {
  const middleware: LanguageModelMiddleware = {
    specificationVersion: "v4",
    wrapStream: async ({ doStream }) => {
      const { stream, ...rest } = await doStream();
      return {
        ...rest,
        stream: stream.pipeThrough(
          new TransformStream({
            transform(chunk, controller) {
              if (chunk.type === "tool-call" && !chunk.providerExecuted) {
                startEarly(
                  calls,
                  chunk.toolName,
                  chunk.input,
                  chunk.toolCallId,
                );
              }
              controller.enqueue(chunk);
            },
          }),
        ),
      };
    },
  };
  return wrapLanguageModel({ model, middleware });
}

/**
 * Starts a tool call of the model, if it is a call of a document tool with
 * an object as its input. For other input, the loop of the AI SDK gives
 * the model an error, and no tool runs.
 */
function startEarly(
  calls: ToolCalls,
  toolName: string,
  input: string,
  toolCallId: string,
) {
  const parsed = parseObject(input);
  if (parsed === undefined || !isDocumentToolName(toolName)) {
    return;
  }
  // The tools examine the fields of their input (`invalid-input`). Thus,
  // an object of a model is a permitted input. The loop awaits the same
  // call later, and handles a call that throws.
  void calls.run(toolName, parsed as never, toolCallId);
}

/** The JSON text as an object, or `undefined` if it is not the JSON of an object. */
function parseObject(json: string): Record<string, unknown> | undefined {
  let value: unknown;
  try {
    value = JSON.parse(json);
  } catch {
    // Text of a model that is not JSON is an expected failure.
    return undefined;
  }
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

/**
 * The type of the stream chunk with the batches of a tool call that
 * started early. The chunk is transient: it is not a part of the chat
 * message. The tool output has the same batches later.
 */
export const DOCUMENT_BATCHES_CHUNK = "data-document-batches";

/** The data of a {@link DOCUMENT_BATCHES_CHUNK} chunk (see `OnBatches`). */
export type DocumentBatchesData = { toolCallId?: string; batches: Batch[] };

/**
 * The type of the stream chunk with the proposal at the start of a run. A
 * host that keeps the proposal sends it (see `sessions/sessionHost.ts`):
 * the client takes this proposal as its copy. The chunk is transient.
 */
export const DOCUMENT_PROPOSAL_CHUNK = "data-document-proposal";

/** The data of a {@link DOCUMENT_PROPOSAL_CHUNK} chunk. */
export type DocumentProposalData = { proposal: Proposal };

/**
 * Returns the UI message stream with a second input: `add` puts the batches
 * of a tool call into the stream at once, as a transient data chunk. After
 * the end or a cancel of the stream, `add` does nothing: no client follows
 * the run.
 *
 * Batches that come before the first chunk of `source` wait for that
 * chunk: a client gets the start of the message first.
 */
export function withBatchChunks(source: ReadableStream<UIMessageChunk>): {
  stream: ReadableStream<UIMessageChunk>;
  add: OnBatches;
} {
  const reader = source.getReader();
  let open = true;
  let enqueue: (chunk: UIMessageChunk) => void = () => undefined;
  /** The batch chunks that wait for the first chunk of `source`. */
  let waiting: UIMessageChunk[] | undefined = [];
  const stream = new ReadableStream<UIMessageChunk>({
    start(controller) {
      enqueue = (chunk) => controller.enqueue(chunk);
    },
    async pull(controller) {
      let next: ReadableStreamReadResult<UIMessageChunk>;
      try {
        next = await reader.read();
      } catch (error) {
        open = false;
        throw error;
      }
      if (next.done) {
        open = false;
        controller.close();
      } else {
        controller.enqueue(next.value);
        for (const chunk of waiting ?? []) {
          controller.enqueue(chunk);
        }
        waiting = undefined;
      }
    },
    cancel(reason) {
      open = false;
      return reader.cancel(reason);
    },
  });
  return {
    stream,
    add(batches, toolCallId) {
      if (!open) {
        return;
      }
      const data: DocumentBatchesData = { toolCallId, batches };
      const chunk: UIMessageChunk = {
        type: DOCUMENT_BATCHES_CHUNK,
        data,
        transient: true,
      };
      if (waiting === undefined) {
        enqueue(chunk);
      } else {
        waiting.push(chunk);
      }
    },
  };
}
