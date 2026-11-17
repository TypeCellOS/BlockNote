import { jsonSchema, tool } from "ai";

import { describeRead, describeWrite } from "./describe.js";
import type {
  EditInput,
  EditOutput,
  RangeInput,
  RangeOutput,
  ReadOutput,
  WriteInput,
  WriteOutput,
} from "./documentTools.js";
import type { ToolCalls } from "./toolCalls.js";
import { DOCUMENT_TOOL_DEFINITIONS } from "./toolDefinitions.js";

/**
 * The document tools as tools of the AI SDK, for one run. Each tool calls a
 * plain function over the handle (see `documentTools.ts`), through the
 * tool calls of the run: a call that a host started early does not run a
 * second time (see `toolCalls.ts`). The description and the input schema of
 * each tool are plain data (see `toolDefinitions.ts`).
 *
 * The output of a tool has two readers. The client gets the full output in
 * the UI message stream, with the extra data of the mode (for example the
 * batches of a proposal). The types of these tools do not have the extra
 * data: the loop does not read it. The model gets a short text
 * (`toModelOutput`): the version, the notes or the error.
 */
export function createDocumentTools(calls: ToolCalls) {
  const { readDocument, editText, replaceRange, writeDocument } =
    DOCUMENT_TOOL_DEFINITIONS;
  return {
    readDocument: tool({
      description: readDocument.description,
      inputSchema: jsonSchema<Record<string, never>>(readDocument.inputSchema),
      execute: (input, { toolCallId }): Promise<ReadOutput> =>
        calls.run("readDocument", input, toolCallId),
      toModelOutput: ({ output }) => ({
        type: "text",
        value: describeRead(output),
      }),
    }),
    editText: tool({
      description: editText.description,
      inputSchema: jsonSchema<EditInput>(editText.inputSchema),
      execute: (input, { toolCallId }): Promise<EditOutput> =>
        calls.run("editText", input, toolCallId),
      toModelOutput: ({ output }) => ({
        type: "text",
        value: describeWrite(output),
      }),
    }),
    replaceRange: tool({
      description: replaceRange.description,
      inputSchema: jsonSchema<RangeInput>(replaceRange.inputSchema),
      execute: (input, { toolCallId }): Promise<RangeOutput> =>
        calls.run("replaceRange", input, toolCallId),
      toModelOutput: ({ output }) => ({
        type: "text",
        value: describeWrite(output),
      }),
    }),
    writeDocument: tool({
      description: writeDocument.description,
      inputSchema: jsonSchema<WriteInput>(writeDocument.inputSchema),
      execute: (input, { toolCallId }): Promise<WriteOutput> =>
        calls.run("writeDocument", input, toolCallId),
      toModelOutput: ({ output }) => ({
        type: "text",
        value: describeWrite(output),
      }),
    }),
  };
}

/** The tools of the document agent (see {@link createDocumentTools}). */
export type DocumentTools = ReturnType<typeof createDocumentTools>;
