import { jsonSchema, tool } from "ai";

import { describeRead, describeWrite } from "./describe.js";
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

/**
 * The document tools as tools of the AI SDK, for one run. Each tool calls a
 * plain function over the handle (see `documentTools.ts`).
 *
 * The output of a tool has two readers. The client gets the full output in
 * the UI message stream, with the batches. The model gets a short text
 * (`toModelOutput`): the version, the notes or the error.
 */
export function createDocumentTools(handle: DocumentHandle) {
  return {
    readDocument: tool({
      description:
        "Reads the document as markdown. The result starts with the version of the document. Call this tool before your first change, and again after a conflict or a text that was not found.",
      inputSchema: jsonSchema<Record<string, never>>({
        type: "object",
        properties: {},
        additionalProperties: false,
      }),
      execute: (): Promise<ReadOutput> => readDocument(handle),
      toModelOutput: ({ output }) => ({
        type: "text",
        value: describeRead(output),
      }),
    }),
    editText: tool({
      description:
        "Replaces one text in the markdown of the document. `old` must be in the document exactly one time: copy it exactly from the markdown, with sufficient text around it. Use this tool for a small change. Make one call for each change that has its own reason.",
      inputSchema: jsonSchema<EditInput>({
        type: "object",
        properties: {
          old: {
            type: "string",
            description: "The exact markdown text to replace.",
          },
          new: {
            type: "string",
            description: "The markdown text to put there.",
          },
          reason: {
            type: "string",
            description:
              "One short sentence for the user: why you make this change.",
          },
        },
        required: ["old", "new", "reason"],
        additionalProperties: false,
      }),
      execute: (input, { toolCallId }): Promise<EditOutput> =>
        editText(handle, input, toolCallId),
      toModelOutput: ({ output }) => ({
        type: "text",
        value: describeWrite(output),
      }),
    }),
    writeDocument: tool({
      description:
        "Writes the full document as markdown. Only your changes apply: the text that you do not change keeps its formatting. Use this tool for a change to many parts of the document, or for a new structure. All changes of one call share one reason.",
      inputSchema: jsonSchema<WriteInput>({
        type: "object",
        properties: {
          markdown: {
            type: "string",
            description: "The full document as markdown, with your changes.",
          },
          base: {
            type: "string",
            description:
              "The version that your markdown starts from: the version from readDocument or from your last write.",
          },
          reason: {
            type: "string",
            description:
              "One short sentence for the user: why you make these changes.",
          },
        },
        required: ["markdown", "base", "reason"],
        additionalProperties: false,
      }),
      execute: (input, { toolCallId }): Promise<WriteOutput> =>
        writeDocument(handle, input, toolCallId),
      toModelOutput: ({ output }) => ({
        type: "text",
        value: describeWrite(output),
      }),
    }),
  };
}

/** The tools of the document agent (see {@link createDocumentTools}). */
export type DocumentTools = ReturnType<typeof createDocumentTools>;
