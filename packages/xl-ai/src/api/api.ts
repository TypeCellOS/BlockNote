import {
  Block,
  BlockNoteEditor,
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import {
  CoreMessage,
  LanguageModel,
  StreamObjectResult,
  generateText,
  jsonSchema,
  streamObject,
} from "ai";
import { markdownNodeDiff } from "../markdown/markdownNodeDiff.js";
import { markdownNodeDiffToBlockOperations } from "../markdown/markdownOperations.js";
import { addFunction } from "./functions/add.js";
import { deleteFunction } from "./functions/delete.js";
import { AIFunction } from "./functions/index.js";
import { updateFunction } from "./functions/update.js";
import { createOperationsArraySchema } from "./schema/operations.js";
import { blockNoteSchemaToJSONSchema } from "./schema/schemaToJSONSchema.js";
import { trimArray } from "./util/trimArray.js";

// TODO don't include child block
export function createMessagesForLLM(opts: {
  editor: BlockNoteEditor;
  prompt: string;
  document: any;
}): Array<CoreMessage> {
  if (opts.editor.getSelection()) {
    return [
      {
        role: "system",
        content: `You're manipulating a text document. Make sure to follow the json schema provided. 
          The user selected everything between [$! and !$], including blocks in between.`,
      },
      {
        role: "system",
        content: JSON.stringify(
          suffixIDs(opts.editor.getSelectionWithMarkers() as any)
        ),
      },
      {
        role: "system",
        content:
          "Make sure to ONLY affect the selected text and blocks (split words if necessary), and don't include the markers in the response.",
      },
      {
        role: "user",
        content: opts.prompt,
      },
    ];
  }
  return [
    {
      role: "system",
      content:
        "You're manipulating a text document. Make sure to follow the json schema provided. This is the document:",
    },
    {
      role: "system",
      content: JSON.stringify(suffixIDs(opts.document)),
    },
    {
      role: "system",
      content:
        "This would be an example block: \n" +
        JSON.stringify({
          type: "paragraph",
          props: {},
          content: [
            {
              type: "text",
              text: "Bold text",
              styles: {
                bold: true,
              },
            },
            {
              type: "text",
              text: " and italic text",
              styles: {
                italic: true,
              },
            },
          ],
        }),
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

type CallLLMOptions = {
  model: LanguageModel;
  functions?: AIFunction[];
} & (
  | {
      prompt: string;
    }
  | {
      messages: Array<CoreMessage>;
    }
);

export async function callLLMStreamingMD(
  editor: BlockNoteEditor<any, any, any>,
  options: CallLLMOptions & {
    _streamObjectOptions?: Partial<Parameters<typeof streamObject<any>>[0]>;
  }
) {
  const markdown = await editor.blocksToMarkdownLossy();

  const withDefaults: Required<
    Omit<CallLLMOptions, "prompt"> & { messages: CoreMessage[] }
  > = {
    messages: [
      {
        role: "system",
        content:
          "You're manipulating a markdown document. Send me the updated markdown. Existing document:",
      },
      {
        role: "system",
        content: markdown,
      },
      {
        role: "user",
        content: (options as any).prompt,
      },
    ],
    ...options,
  };

  const ret = await generateText<any>({
    model: withDefaults.model,
    messages: withDefaults.messages,
    ...(options._streamObjectOptions as any),
  });

  const blocks = trimArray(editor.document, (block) => {
    return (
      block.type === "paragraph" &&
      Array.isArray(block.content) &&
      block.content.length === 0
    );
  });
  const newMarkdown = ret.text.trim();

  const diff = await markdownNodeDiff(markdown, newMarkdown);
  const operations = await markdownNodeDiffToBlockOperations(
    editor,
    blocks,
    diff
  );

  for (const operation of operations) {
    await applyAIOperation(
      operation,
      editor,
      [updateFunction, addFunction, deleteFunction],
      undefined,
      { idsSuffixed: false }
    );
  }
}

export async function callLLMStreaming(
  editor: BlockNoteEditor<any, any, any>,
  options: CallLLMOptions & {
    _streamObjectOptions?: Partial<Parameters<typeof streamObject<any>>[0]>;
  }
) {
  const withDefaults: Required<
    Omit<CallLLMOptions, "prompt"> & { messages: CoreMessage[] }
  > = {
    functions: [updateFunction, addFunction, deleteFunction],
    messages:
      (options as any).messages ||
      createMessagesForLLM({
        editor,
        prompt: (options as any).prompt,
        document: editor.document,
      }),

    ...options,
  };

  const ret = streamObject<any>({
    model: withDefaults.model,
    mode: "tool",
    schema: jsonSchema({
      ...createOperationsArraySchema(withDefaults.functions),
      $defs: blockNoteSchemaToJSONSchema(editor.schema).$defs as any,
    }),
    messages: withDefaults.messages,
    ...(options._streamObjectOptions as any),
  });
  return await applyLLMResponse(editor, ret, withDefaults.functions);
}

export function applyAIOperation(
  operation: any,
  editor: BlockNoteEditor,
  functions: AIFunction[],
  operationContext: any,
  options: {
    idsSuffixed: boolean;
  } = {
    idsSuffixed: false,
  }
) {
  const func = functions.find((func) => func.schema.name === operation.type);
  if (!func || !func.validate(operation, editor, options)) {
    console.log("INVALID OPERATION", operation);
    return operationContext;
  }
  return func.apply(operation, editor, operationContext, options);
}

export async function applyLLMResponse(
  editor: BlockNoteEditor,
  response: StreamObjectResult<any, any, any>,
  functions: AIFunction[]
) {
  let numOperationsAppliedCompletely = 0;
  let operationContext: any = undefined;

  for await (const partialObject of response.partialObjectStream) {
    const operations: [] = partialObject.operations || [];
    console.log(operations);
    let isFirst = true;
    for (const operation of operations.slice(numOperationsAppliedCompletely)) {
      operationContext = applyAIOperation(
        operation,
        editor,
        functions,
        isFirst ? operationContext : undefined
      );
      isFirst = false;
    }

    numOperationsAppliedCompletely = operations.length - 1;
  }
  return response;
}

// - cursor position
// - API design (customize context, cursor position, prompt, stream / nostream, validation)
