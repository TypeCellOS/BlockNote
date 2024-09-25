import { createOpenAI } from "@ai-sdk/openai";
import {
  Block,
  BlockNoteEditor,
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { CoreMessage, StreamObjectResult, jsonSchema, streamObject } from "ai";
import { AIFunction } from "./functions";
import { addFunction } from "./functions/add";
import { deleteFunction } from "./functions/delete";
import { updateFunction } from "./functions/update";
import { createOperationsArraySchema } from "./schema/operations";

export function createMessagesForLLM(opts: {
  prompt: string;
  document: any;
}): Array<CoreMessage> {
  return [
    {
      role: "system",
      content: "You're manipulating a text document. This is the document:",
    },
    {
      role: "system",
      content: JSON.stringify(suffixIDs(opts.document)),
    },
    {
      role: "user",
      content: opts.prompt,
    },
  ];
}

export function suffixIDs<
  T extends Block<BlockSchema, InlineContentSchema, StyleSchema>
>(blocks: T[]): T[] {
  return blocks.map((block) => ({
    ...block,
    id: `${block.id}$`,
    children: suffixIDs(block.children),
  }));
}

export async function callLLM(
  editor: BlockNoteEditor<any, any, any>,
  prompt: string
) {
  const functions = [updateFunction, addFunction, deleteFunction];

  const model = createOpenAI({
    apiKey: "",
  })("gpt-4o-2024-08-06", {});

  const ret = await streamObject<any>({
    model,
    mode: "tool",
    schema: jsonSchema(createOperationsArraySchema(functions)),
    messages: createMessagesForLLM({ prompt, document: editor.document }),
  });
  await applyLLMResponse(editor, ret, functions);
}

export function applyAIOperation(
  editor: BlockNoteEditor,
  operation: any,
  functions: AIFunction[]
) {
  const func = functions.find((func) => func.schema.name === operation.type);
  if (!func || !func.validate(operation, editor)) {
    return;
  }
  func.apply(operation, editor);
}

export async function applyLLMResponse(
  editor: BlockNoteEditor,
  response: StreamObjectResult<any, any, any>,
  functions: AIFunction[]
) {
  let numOperationsAppliedCompletely = 0;

  for await (const partialObject of response.partialObjectStream) {
    const operations: [] = partialObject.operations || [];

    for (const operation of operations.slice(numOperationsAppliedCompletely)) {
      applyAIOperation(operation, editor, functions);
    }
    numOperationsAppliedCompletely = operations.length - 1;
  }
}

// - cursor position
// - API design (customize context, cursor position, prompt, stream / nostream, validation)
