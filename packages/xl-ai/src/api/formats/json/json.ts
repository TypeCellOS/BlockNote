import { BlockNoteEditor } from "@blocknote/core";
import { LanguageModel, generateObject, jsonSchema, streamObject } from "ai";

import {
  executeAIOperation,
  executeAIOperationStream,
} from "../../executor/executor.js";
import { addFunction } from "../../functions/add.js";
import { deleteFunction } from "../../functions/delete.js";
import { AIFunction } from "../../functions/index.js";
import { updateFunction } from "../../functions/update.js";
import type { PromptOrMessages } from "../../index.js";
import { promptManipulateDocumentUseJSONSchema } from "../../prompts/jsonSchemaPrompts.js";
import { createOperationsArraySchema } from "../../schema/operations.js";
import { blockNoteSchemaToJSONSchema } from "../../schema/schemaToJSONSchema.js";

type BasicLLMRequestOptions = {
  model: LanguageModel;
  functions: AIFunction[];
} & PromptOrMessages;

type StreamLLMRequestOptions = {
  stream: true;
  _streamObjectOptions?: Partial<Parameters<typeof streamObject<any>>[0]>;
};

type NoStreamLLMRequestOptions = {
  stream: false;
  _generateObjectOptions?: Partial<Parameters<typeof generateObject<any>>[0]>;
};

type CallLLMOptions = BasicLLMRequestOptions &
  (StreamLLMRequestOptions | NoStreamLLMRequestOptions);

type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

type CallLLMOptionsWithOptional = Optional<
  CallLLMOptions,
  "functions" | "stream"
>;

export async function callLLM(
  editor: BlockNoteEditor<any, any, any>,
  opts: CallLLMOptionsWithOptional
) {
  const { prompt, ...rest } = opts;

  const options: CallLLMOptions = {
    functions: [updateFunction, addFunction, deleteFunction],
    stream: true,
    messages:
      "messages" in opts && opts.messages !== undefined
        ? opts.messages
        : promptManipulateDocumentUseJSONSchema({
            editor,
            userPrompt: opts.prompt!,
            document: editor.document,
          }),
    ...rest,
  };

  const schema = jsonSchema({
    ...createOperationsArraySchema(options.functions),
    $defs: blockNoteSchemaToJSONSchema(editor.schema).$defs as any,
  });

  if (options.stream) {
    const ret = streamObject<{
      operations: any[];
    }>({
      model: options.model,
      mode: "tool",
      schema,
      messages: options.messages,
      ...(options._streamObjectOptions as any),
    });

    await executeAIOperationStream(
      editor,
      ret.partialObjectStream,
      options.functions
    );
    return ret;
  }
  // non streaming
  const ret = await generateObject<{
    operations: any[];
  }>({
    model: options.model,
    mode: "tool",
    schema,
    messages: options.messages,
    ...(options._generateObjectOptions as any),
  });

  if (!ret.object.operations) {
    throw new Error("No operations returned");
  }

  for (const operation of ret.object.operations) {
    await executeAIOperation(operation, editor, options.functions, undefined, {
      idsSuffixed: true, // TODO: not needed for this, but would need to refactor promptbuilding
    });
  }
  return ret;
}
