import { createOpenAI } from "@ai-sdk/openai";
import { BlockNoteEditor } from "@blocknote/core";
import { jsonSchema, streamObject } from "ai";
import { SimpleJSONObjectSchema } from "./schemaToJSONSchema";

export const AI_OPERATION_DELETE = {
  name: "delete",
  description: "Delete a block",
  parameters: {
    id: {
      type: "string",
      description: "id of block to delete",
    },
  },
  required: ["id"],
};

export function operationToJSONSchema(operation: any) {
  // const parameterProperties = Object.entries(operation.parameters).map(
  //   ([key, value]) => {
  //     const { required, ...rest } = value;
  //     return {
  //       [key]: rest,
  //     };
  //   }
  // );
  return {
    type: "object",
    description: operation.description,
    properties: {
      type: {
        type: "string",
        enum: [operation.name],
      },
      ...operation.parameters,

      // ...Object.entries(operation.parameters).map(([key, value]) => {
      // return {
      // [key]: value,
      // };
      // }),
    },
    required: ["type", ...operation.required],
    additionalProperties: false,
  } as const;
}

export const AI_OPERATION_INSERT = {
  description: "Insert new blocks",
  parameters: {
    referenceId: {
      type: "string",
      description: "",
      required: true,
    },
    position: {
      type: "string",
      enum: ["before", "after"],
      description:
        "Whether new block(s) should be inserterd before or after `referenceId`",
      required: true,
    },
    blocks: {
      items: {
        // $ref: "#/definitions/newblock",
        type: "object",
        properties: {},
      },
      type: "array",
      required: true,
    },
  },
};

export const AI_OPERATION_UPDATE = {
  name: "update",
  description: "Update a block",
  parameters: {
    id: {
      type: "string",
      description: "id of block to update",
    },
    block: {
      // $ref: "#/definitions/newblock",
      type: "object",
      properties: {},
    },
  },
  required: ["id", "block"],
};

// UPDATE_MARKDOWN
// INSERT_MARKDOWN

export function createOperationsArraySchema(
  operations: any[]
): SimpleJSONObjectSchema {
  return {
    type: "object",
    properties: {
      operations: {
        type: "array",
        items: {
          anyOf: operations.map((op) => operationToJSONSchema(op)),
        },
      },
    },
    additionalProperties: false,
    required: ["operations"] as string[],
  };
}

export async function streamDocumentOperations(
  editor: BlockNoteEditor<any, any, any>,
  prompt: string
) {
  const model = createOpenAI({
    apiKey: "",
  })("gpt-4o-2024-08-06", {});

  const ret = await streamObject<any>({
    model,
    mode: "tool",
    schema: jsonSchema(
      createOperationsArraySchema([AI_OPERATION_UPDATE] as any)
    ),
    messages: [
      {
        role: "system",
        content: "You're manipulating a text document. This is the document:",
      },
      {
        role: "system",
        content: JSON.stringify(editor.document),
      },
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  let numOperationsAppliedCompletely = 0;

  for await (const partialObject of ret.partialObjectStream) {
    const operations: [] = partialObject.operations || [];

    for (const operation of operations.slice(numOperationsAppliedCompletely)) {
      applyOperation(operation, editor);
    }
    numOperationsAppliedCompletely = operations.length - 1;
  }
}

function applyOperation(operation: any, editor: BlockNoteEditor) {
  if (operation.type === AI_OPERATION_UPDATE.name) {
    console.log("applyOperation", operation);
    if (!(operation?.id?.length > 0 && operation?.block)) {
      return;
    }

    if (
      ((operation.block.content as []) || []).find(
        (content: any) => content.type !== "text" || !("text" in content)
      )
    ) {
      return;
    }
    console.log("execute", operation);
    editor.updateBlock(operation.id, operation.block);
  }
}

// - cursor position
// - API design (customize context, cursor position, prompt, stream / nostream, validation)
