import { jsonSchema, tool } from "ai";

import { describeRead, describeWrite } from "./describe.js";
import type {
  EditInput,
  EditOutput,
  RangeInput,
  ReadOutput,
  WriteInput,
  WriteOutput,
} from "./documentTools.js";
import type { ToolCalls } from "./toolCalls.js";

/**
 * The document tools as tools of the AI SDK, for one run. Each tool calls a
 * plain function over the handle (see `documentTools.ts`), through the
 * tool calls of the run: a call that a host started early does not run a
 * second time (see `toolCalls.ts`).
 *
 * The output of a tool has two readers. The client gets the full output in
 * the UI message stream, with the batches. The model gets a short text
 * (`toModelOutput`): the version, the notes or the error.
 */
export function createDocumentTools(calls: ToolCalls) {
  return {
    readDocument: tool({
      description:
        "Reads the current document as markdown. The result starts with the version of the document. The last message of the user already has the document: call this tool only after a conflict, after a text that was not found, or when a tool result tells you that the users changed the document.",
      inputSchema: jsonSchema<Record<string, never>>({
        type: "object",
        properties: {},
        additionalProperties: false,
      }),
      execute: (input, { toolCallId }): Promise<ReadOutput> =>
        calls.run("readDocument", input, toolCallId),
      toModelOutput: ({ output }) => ({
        type: "text",
        value: describeRead(output),
      }),
    }),
    editText: tool({
      description:
        "Replaces one text in the markdown of the document. `old` must be in the document exactly one time: copy it exactly from the markdown, with sufficient text around it. Use this tool for a change of some words or of one sentence. Make one call for each change that has its own reason.",
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
        calls.run("editText", input, toolCallId),
      toModelOutput: ({ output }) => ({
        type: "text",
        value: describeWrite(output),
      }),
    }),
    replaceRange: tool({
      description:
        "Replaces a longer text in the markdown of the document, for example a full paragraph: the text from `from` to `to`, with these two texts. You give only the first words and the last words of the text to replace, not the text between them. `from` must be in the document exactly one time, and `to` exactly one time after `from`: copy them exactly from the markdown, about five words each. Use this tool for a change of a full paragraph or of some paragraphs that are next to each other, and editText for a change of some words.",
      inputSchema: jsonSchema<RangeInput>({
        type: "object",
        properties: {
          from: {
            type: "string",
            description: "The first words of the markdown text to replace.",
          },
          to: {
            type: "string",
            description: "The last words of the markdown text to replace.",
          },
          new: {
            type: "string",
            description:
              "The markdown text to put there, in place of the text from `from` to `to`.",
          },
          reason: {
            type: "string",
            description:
              "One short sentence for the user: why you make this change.",
          },
        },
        required: ["from", "to", "new", "reason"],
        additionalProperties: false,
      }),
      execute: (input, { toolCallId }): Promise<EditOutput> =>
        calls.run("replaceRange", input, toolCallId),
      toModelOutput: ({ output }) => ({
        type: "text",
        value: describeWrite(output),
      }),
    }),
    writeDocument: tool({
      description:
        "Writes the full document as markdown. Only your changes apply: the text that you do not change keeps its formatting. Use this tool for a change to most of the document, for a new structure, or for a new document. All changes of one call share one reason.",
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
