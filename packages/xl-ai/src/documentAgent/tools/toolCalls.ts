import type { Batch } from "../proposal/types.js";
import {
  type EditInput,
  type EditOutput,
  editText,
  type ReadOutput,
  readDocument,
  type WriteInput,
  type WriteOutput,
  writeDocument,
} from "./documentTools.js";
import type { DocumentHandle } from "./handle.js";

/** The input and the output of each document tool. */
export type DocumentToolTypes = {
  readDocument: { input: Record<string, never>; output: ReadOutput };
  editText: { input: EditInput; output: EditOutput };
  writeDocument: { input: WriteInput; output: WriteOutput };
};

/** The name of a document tool. */
export type DocumentToolName = keyof DocumentToolTypes;

/** Returns true if the name is the name of a document tool. */
export function isDocumentToolName(name: string): name is DocumentToolName {
  return (
    name === "readDocument" || name === "editText" || name === "writeDocument"
  );
}

/**
 * The tool calls of one run. Each tool call runs one time: the first
 * request for a tool call ID starts the call, and a later request for that
 * ID gets the same result.
 *
 * The reason: the loop of the AI SDK runs the tools of a step only when
 * the model has written the full step. A host starts a call earlier, when
 * the model has written that call (see `withEarlyToolCalls`). Then the loop
 * asks for the same call, and gets the result of the early start.
 */
export type ToolCalls = {
  run<Name extends DocumentToolName>(
    name: Name,
    input: DocumentToolTypes[Name]["input"],
    toolCallId: string,
  ): Promise<DocumentToolTypes[Name]["output"]>;
};

/**
 * A listener for the batches that a run adds to the proposal, at the time
 * that the proposal has them. `toolCallId` is the tool call that added
 * them. It is `undefined` for the read of the document at the start of a
 * run, which can rebase the proposal.
 */
export type OnBatches = (batches: Batch[], toolCallId?: string) => void;

/**
 * Makes the tool calls of one run on the handle. `onBatches` gets the
 * batches of each call when the call ends: a host sends them to a client
 * that follows the run, before the loop has the tool output.
 */
export function createToolCalls(
  handle: DocumentHandle,
  onBatches?: OnBatches,
): ToolCalls {
  const tools: {
    [Name in DocumentToolName]: (
      input: DocumentToolTypes[Name]["input"],
      toolCallId: string,
    ) => Promise<DocumentToolTypes[Name]["output"]>;
  } = {
    readDocument: () => readDocument(handle),
    editText: (input, toolCallId) => editText(handle, input, toolCallId),
    writeDocument: (input, toolCallId) =>
      writeDocument(handle, input, toolCallId),
  };
  /** The calls that started, by tool name and tool call ID. */
  const started: {
    [Name in DocumentToolName]: Map<
      string,
      Promise<DocumentToolTypes[Name]["output"]>
    >;
  } = {
    readDocument: new Map(),
    editText: new Map(),
    writeDocument: new Map(),
  };

  return {
    run<Name extends DocumentToolName>(
      name: Name,
      input: DocumentToolTypes[Name]["input"],
      toolCallId: string,
    ): Promise<DocumentToolTypes[Name]["output"]> {
      const calls: Map<
        string,
        Promise<DocumentToolTypes[Name]["output"]>
      > = started[name];
      let call = calls.get(toolCallId);
      if (call === undefined) {
        call = tools[name](input, toolCallId);
        calls.set(toolCallId, call);
        // A call that throws gives no batches. The loop gets the exception
        // from `call` itself, and fails the run.
        call.then(
          (output) => {
            if (output.batches.length > 0) {
              onBatches?.(output.batches, toolCallId);
            }
          },
          () => undefined,
        );
      }
      return call;
    },
  };
}
