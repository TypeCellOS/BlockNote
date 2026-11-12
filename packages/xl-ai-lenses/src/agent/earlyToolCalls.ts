import {
  type LanguageModel,
  type LanguageModelMiddleware,
  type UIMessageChunk,
  wrapLanguageModel,
} from "ai";

import { isDocumentToolName, type ToolCalls } from "../tools/toolCalls.js";

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
export function withEarlyToolCalls<Extra extends object>(
  model: LanguageModelObject,
  calls: ToolCalls<Extra>,
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
function startEarly<Extra extends object>(
  calls: ToolCalls<Extra>,
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
 * Returns the UI message stream with a second input: `add` puts a chunk of
 * a host into the stream at once (for example a transient data chunk with
 * the batches of a tool call). After the end or a cancel of the stream,
 * `add` does nothing: no client follows the run.
 *
 * Chunks that come before the first chunk of `source` wait for that
 * chunk: a client gets the start of the message first.
 */
export function withAddedChunks(source: ReadableStream<UIMessageChunk>): {
  stream: ReadableStream<UIMessageChunk>;
  add: (chunk: UIMessageChunk) => void;
} {
  const reader = source.getReader();
  let open = true;
  let enqueue: (chunk: UIMessageChunk) => void = () => undefined;
  /** The added chunks that wait for the first chunk of `source`. */
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
    add(chunk) {
      if (!open) {
        return;
      }
      if (waiting === undefined) {
        enqueue(chunk);
      } else {
        waiting.push(chunk);
      }
    },
  };
}
