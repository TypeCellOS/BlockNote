import { SimpleJSONObjectSchema } from "../util/JSONSchema.js";
import { StreamTool } from "./streamTool.js";

export function streamToolToJSONSchema(tool: StreamTool<any>) {
  // this adds the tool name as the "type". (not very clean way to do it)
  const { properties, required, ...rest } = tool.parameters;
  return {
    type: "object",
    description: tool.description,
    properties: {
      type: {
        type: "string",
        enum: [tool.name],
      },
      ...properties,
    },
    required: ["type", ...(required ?? [])],
    additionalProperties: false,
    ...rest,
  } as const;
}

export function createStreamToolsArraySchema(
  streamTools: StreamTool<any>[]
): SimpleJSONObjectSchema {
  return {
    type: "object",
    properties: {
      operations: {
        type: "array",
        items: {
          anyOf: streamTools.map((op) => streamToolToJSONSchema(op)),
        },
      },
    },
    additionalProperties: false,
    required: ["operations"] as string[],
  };
}
