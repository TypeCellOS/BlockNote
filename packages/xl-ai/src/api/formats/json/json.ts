import { BlockNoteEditor } from "@blocknote/core";
import {
  CoreMessage,
  LanguageModel,
  generateObject,
  jsonSchema,
  streamObject,
} from "ai";
import {
  executeAIOperation,
  executeAIOperationStream,
} from "../../executor/executor.js";
import { addFunction } from "../../functions/add.js";
import { deleteFunction } from "../../functions/delete.js";
import { AIFunction } from "../../functions/index.js";
import { updateFunction } from "../../functions/update.js";
import { promptManipulateDocumentUseJSONSchema } from "../../prompts/jsonSchemaPrompts.js";
import { createOperationsArraySchema } from "../../schema/operations.js";
import { blockNoteSchemaToJSONSchema } from "../../schema/schemaToJSONSchema.js";

// TODO: makes sense?
type PromptOrMessages =
  | {
      prompt: string;
    }
  | {
      messages: Array<CoreMessage>;
    };

type BasicLLMRequestOptions = {
  model: LanguageModel;
  functions?: AIFunction[];
} & PromptOrMessages;

type StreamLLMRequestOptions = BasicLLMRequestOptions & {
  stream: true;
  _streamObjectOptions?: Partial<Parameters<typeof streamObject<any>>[0]>;
};

type NoStreamLLMRequestOptions = BasicLLMRequestOptions & {
  stream?: false;
  _generateObjectOptions?: Partial<Parameters<typeof generateObject<any>>[0]>;
};

type CallLLMOptions = StreamLLMRequestOptions | NoStreamLLMRequestOptions;

export async function callLLM(
  editor: BlockNoteEditor<any, any, any>,
  options: CallLLMOptions
) {
  const withDefaults: Required<
    Omit<
      CallLLMOptions & {
        messages: Array<CoreMessage>;
      },
      "prompt"
    >
  > = {
    functions: [updateFunction, addFunction, deleteFunction],
    stream: true,
    messages:
      "messages" in options
        ? options.messages
        : promptManipulateDocumentUseJSONSchema({
            editor,
            userPrompt: options.prompt,
            document: editor.document,
          }),

    ...options,
  };

  const schema = jsonSchema({
    ...createOperationsArraySchema(withDefaults.functions),
    $defs: blockNoteSchemaToJSONSchema(editor.schema).$defs as any,
  });

  if (options.stream) {
    const ret = streamObject<{
      operations: any[];
    }>({
      model: withDefaults.model,
      mode: "tool",
      schema,
      messages: withDefaults.messages,
      ...(options._streamObjectOptions as any),
    });
    await executeAIOperationStream(
      editor,
      ret.partialObjectStream,
      withDefaults.functions
    );
    return ret;
  }

  // non streaming
  const ret = await generateObject<{
    operations: any[];
  }>({
    model: withDefaults.model,
    mode: "tool",
    schema,
    messages: withDefaults.messages,
    ...(options._generateObjectOptions as any),
  });

  if (!ret.object.operations) {
    throw new Error("No operations returned");
  }

  for (const operation of ret.object.operations) {
    await executeAIOperation(
      operation,
      editor,
      withDefaults.functions,
      undefined,
      {
        idsSuffixed: true, // TODO: not needed for this, but would need to refactor promptbuilding
      }
    );
  }
  return ret;
}
