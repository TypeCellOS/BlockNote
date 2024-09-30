import { AIFunction } from "../functions";
import { SimpleJSONObjectSchema } from "../util/JSONSchema";

export function functionToOperationJSONSchema(func: AIFunction) {
  return {
    type: "object",
    description: func.schema.description,
    properties: {
      type: {
        type: "string",
        enum: [func.schema.name],
      },
      ...func.schema.parameters,
    },
    required: ["type", ...func.schema.required],
    additionalProperties: false,
  } as const;
}

export function createOperationsArraySchema(
  functions: AIFunction[]
): SimpleJSONObjectSchema {
  return {
    type: "object",
    properties: {
      operations: {
        type: "array",
        items: {
          anyOf: functions.map((op) => functionToOperationJSONSchema(op)),
        },
      },
    },
    additionalProperties: false,
    required: ["operations"] as string[],
  };
}
