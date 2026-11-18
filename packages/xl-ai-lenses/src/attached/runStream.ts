import { generateId, type UIMessageChunk } from "ai";

import type { DocumentToolName } from "../tools/toolCalls.js";

/**
 * The UI message stream of one run that a caller writes, with the
 * functions that add its chunks. The chunks have the structure that the
 * loop of the AI SDK gives: the message starts, and each LLM step of the
 * agent is one step of the stream.
 *
 * An agent that calls the tools itself does not show its LLM steps. The
 * stream starts a new step for the first content after a tool output, if
 * each tool call that started has its output: the agent makes a new LLM
 * call for the results. The parts of a tool call must be in one step: a
 * reader of the stream finds the part of a tool call only in the current
 * step.
 *
 * `onCancel` is called when the reader of the stream cancels it.
 */
export function createRunStream(onCancel: () => void) {
  let controller: ReadableStreamDefaultController<UIMessageChunk> | undefined;
  let open = true;
  /** The ID of the text part that the agent writes now. */
  let textId: string | undefined;
  /** True if the step has a tool output. */
  let stepHasOutput = false;
  /** The tool calls of the step that have no output. */
  const openCalls = new Set<string>();

  const stream = new ReadableStream<UIMessageChunk>({
    start(streamController) {
      controller = streamController;
    },
    cancel() {
      open = false;
      onCancel();
    },
  });

  function add(chunk: UIMessageChunk) {
    if (open) {
      controller?.enqueue(chunk);
    }
  }

  function endText() {
    if (textId !== undefined) {
      add({ type: "text-end", id: textId });
      textId = undefined;
    }
  }

  function nextStep() {
    if (stepHasOutput && openCalls.size === 0) {
      endText();
      add({ type: "finish-step" });
      add({ type: "start-step" });
      stepHasOutput = false;
    }
  }

  return {
    stream,
    /** True until the stream ends or fails. */
    isOpen: () => open,
    /** Adds a chunk of the host, or of the structure of the message. */
    add,
    /** Adds a text of the agent, as its own text part. */
    text(text: string) {
      nextStep();
      endText();
      textId = generateId();
      add({ type: "text-start", id: textId });
      add({ type: "text-delta", id: textId, delta: text });
    },
    /** Adds a tool call with its input. Its output comes with `toolOutput`. */
    toolInput(toolCallId: string, toolName: DocumentToolName, input: object) {
      nextStep();
      endText();
      openCalls.add(toolCallId);
      add({ type: "tool-input-start", toolCallId, toolName });
      add({ type: "tool-input-available", toolCallId, toolName, input });
    },
    toolOutput(toolCallId: string, output: object) {
      add({ type: "tool-output-available", toolCallId, output });
      openCalls.delete(toolCallId);
      stepHasOutput = true;
    },
    /** Ends the stream, with `last` as its last chunk. */
    end(last: UIMessageChunk) {
      if (!open) {
        return;
      }
      endText();
      add({ type: "finish-step" });
      add(last);
      open = false;
      controller?.close();
    },
    /** Fails the stream: a bug or an outage. */
    fail(error: unknown) {
      if (open) {
        open = false;
        controller?.error(error);
      }
    },
  };
}

export type RunStream = ReturnType<typeof createRunStream>;
