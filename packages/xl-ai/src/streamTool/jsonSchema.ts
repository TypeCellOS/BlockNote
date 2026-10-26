import { jsonSchema, ToolSet } from "ai";
import type { JSONSchema7, JSONSchema7Definition } from "json-schema";
import { StreamTool } from "./streamTool.js";

// Schemas contain JSON values: compare object keys without depending on their
// order or treating a schema property named "constructor" as a JS prototype.
function isSchemaObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function equalSchemaValue(left: unknown, right: unknown): boolean {
  if (left === right) {
    return true;
  }
  if (Array.isArray(left)) {
    return (
      Array.isArray(right) &&
      left.length === right.length &&
      left.every((value: unknown, index) =>
        equalSchemaValue(value, right[index]),
      )
    );
  }
  if (Array.isArray(right) || !isSchemaObject(left) || !isSchemaObject(right)) {
    return false;
  }
  const keys = Object.keys(left);
  return (
    keys.length === Object.keys(right).length &&
    keys.every(
      (key) =>
        Object.hasOwn(right, key) && equalSchemaValue(left[key], right[key]),
    )
  );
}

function streamToolToJSONSchema(tool: StreamTool<any>): {
  schema: JSONSchema7;
  $defs?: Record<string, JSONSchema7Definition>;
} {
  // this adds the tool name as the "type". (not very clean way to do it)
  const { properties, required, $defs, ...rest } = tool.inputSchema;
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
): JSONSchema7 {
  const schemas = streamTools.map((tool) => streamToolToJSONSchema(tool));

  const $defs: Record<string, JSONSchema7Definition> = {};
  for (const schema of schemas) {
    for (const key in schema.$defs) {
      if ($defs[key] && !equalSchemaValue($defs[key], schema.$defs[key])) {
        throw new Error(`Duplicate, but different definition for ${key}`);
      }
      $defs[key] = schema.$defs[key];
    }
  }

  return {
    type: "object",
    properties: {
      operations: {
        //description:
        // "Operations to apply to the document. Put all operations in this array in ONE tool call / function call. DO NOT use multiple operation arrays with parallel tool calls.",
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

export function streamToolsToToolSet(streamTools: StreamTool<any>[]): ToolSet {
  return {
    applyDocumentOperations: {
      inputSchema: jsonSchema(createStreamToolsArraySchema(streamTools)),
      outputSchema: jsonSchema({ type: "object" }),
    },
  };
}
