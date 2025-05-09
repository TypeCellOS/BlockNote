import type { JSONSchema7Definition } from "json-schema";
import isEqual from "lodash.isequal";
import { SimpleJSONObjectSchema } from "../api/util/JSONSchema.js";
import { StreamTool } from "./streamTool.js";

function streamToolToJSONSchema(tool: StreamTool<any>) {
  // this adds the tool name as the "type". (not very clean way to do it)
  const { properties, required, $defs, ...rest } = tool.parameters;
  return {
    schema: {
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
    },
    $defs,
  };
}

/**
 * Creates the JSON Schema for an object that can represent a call to one or more StreamTools.
 *
 * E.g., given StreamTools add, delete, update, returns the json schema for an object that conforms to this shape:
 *
 * {
 *   "operations": [
 *     {
 *       "type": "add",
 *       ...parameters for add function...
 *     },
 *     {
 *       "type": "delete",
 *       ...parameters for delete function...
 *     },
 *     ...
 *   ]
 * }
 */
export function createStreamToolsArraySchema(
  streamTools: StreamTool<any>[],
): SimpleJSONObjectSchema & { $defs?: Record<string, JSONSchema7Definition> } {
  const schemas = streamTools.map((tool) => streamToolToJSONSchema(tool));

  const $defs: Record<string, JSONSchema7Definition> = {};
  for (const schema of schemas) {
    for (const key in schema.$defs) {
      if ($defs[key] && !isEqual($defs[key], schema.$defs[key])) {
        throw new Error(`Duplicate, but different definition for ${key}`);
      }
      $defs[key] = schema.$defs[key];
    }
  }

  return {
    type: "object",
    properties: {
      operations: {
        type: "array",
        items: {
          anyOf: schemas.map((schema) => schema.schema),
        },
      },
    },
    additionalProperties: false,
    required: ["operations"] as string[],
    $defs: Object.keys($defs).length > 0 ? $defs : undefined,
  };
}
