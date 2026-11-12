import type { AgentDocument } from "./agentDocument.js";
import {
  type EditInput,
  type EditOutput,
  editText,
  type RangeInput,
  replaceRange,
  type ReadOutput,
  readDocument,
  type WriteInput,
  type WriteOutput,
  writeDocument,
} from "./documentTools.js";

/**
 * The input and the output of each document tool. Each output has the
 * extra data of the mode of the document (see `AgentDocument`).
 */
export type DocumentToolTypes<Extra extends object = object> = {
  readDocument: { input: Record<string, never>; output: ReadOutput & Extra };
  editText: { input: EditInput; output: EditOutput & Extra };
  replaceRange: { input: RangeInput; output: EditOutput & Extra };
  writeDocument: { input: WriteInput; output: WriteOutput & Extra };
};

/** The name of a document tool. */
export type DocumentToolName = keyof DocumentToolTypes;

/** Returns true if the name is the name of a document tool. */
export function isDocumentToolName(name: string): name is DocumentToolName {
  return (
    name === "readDocument" ||
    name === "editText" ||
    name === "replaceRange" ||
    name === "writeDocument"
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
export type ToolCalls<Extra extends object = object> = {
  run<Name extends DocumentToolName>(
    name: Name,
    input: DocumentToolTypes<Extra>[Name]["input"],
    toolCallId: string,
  ): Promise<DocumentToolTypes<Extra>[Name]["output"]>;
};

/**
 * A listener for the extra data of a step of a run, at the end of the
 * step (for example the batches that the step added to a proposal).
 * `toolCallId` is the tool call of the step. It is `undefined` for the
 * read of the document at the start of a run.
 */
export type OnExtra<Extra extends object> = (
  extra: Extra,
  toolCallId?: string,
) => void;

/**
 * Makes the tool calls of one run on the document. `onExtra` gets the
 * extra data of each call when the call ends: a host sends it to a client
 * that follows the run, before the loop has the tool output.
 */
export function createToolCalls<Extra extends object>(
  document: AgentDocument<Extra>,
  onExtra?: OnExtra<Extra>,
): ToolCalls<Extra> {
  const tools: {
    [Name in DocumentToolName]: (
      input: DocumentToolTypes<Extra>[Name]["input"],
      toolCallId: string,
    ) => Promise<DocumentToolTypes<Extra>[Name]["output"]>;
  } = {
    readDocument: () => readDocument(document),
    editText: (input, toolCallId) => editText(document, input, toolCallId),
    replaceRange: (input, toolCallId) =>
      replaceRange(document, input, toolCallId),
    writeDocument: (input, toolCallId) =>
      writeDocument(document, input, toolCallId),
  };
  /** The calls that started, by tool name and tool call ID. */
  const started: {
    [Name in DocumentToolName]: Map<
      string,
      Promise<DocumentToolTypes<Extra>[Name]["output"]>
    >;
  } = {
    readDocument: new Map(),
    editText: new Map(),
    replaceRange: new Map(),
    writeDocument: new Map(),
  };

  return {
    run<Name extends DocumentToolName>(
      name: Name,
      input: DocumentToolTypes<Extra>[Name]["input"],
      toolCallId: string,
    ): Promise<DocumentToolTypes<Extra>[Name]["output"]> {
      const calls: Map<
        string,
        Promise<DocumentToolTypes<Extra>[Name]["output"]>
      > = started[name];
      let call = calls.get(toolCallId);
      if (call === undefined) {
        call = tools[name](input, toolCallId);
        calls.set(toolCallId, call);
        // A call that throws gives no extra data. The loop gets the
        // exception from `call` itself, and fails the run.
        call.then(
          (output) => onExtra?.(output, toolCallId),
          () => undefined,
        );
      }
      return call;
    },
  };
}
