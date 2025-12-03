import { asSchema, jsonSchema, JSONSchema7, tool, ToolSet } from "ai";

/**
 * A serializable version of a Tool
 */
type ToolDefinition = {
  description?: string;
  inputSchema: JSONSchema7;
  outputSchema: JSONSchema7;
};

type ToolDefinitions = Record<string, ToolDefinition>;

export function toolSetToToolDefinitions(toolSet: ToolSet): ToolDefinitions {
  return Object.fromEntries(
    Object.entries(toolSet).map(([name, tool]) => [
      name,
      {
        description: tool.description,
        inputSchema: asSchema(tool.inputSchema).jsonSchema,
        outputSchema: asSchema(tool.outputSchema).jsonSchema,
      },
    ]),
  );
}

export function toolDefinitionsToToolSet(
  toolDefinitions: ToolDefinitions,
): ToolSet {
  return Object.fromEntries(
    Object.entries(toolDefinitions).map(([name, definition]) => [
      name,
      tool({
        ...definition,
        inputSchema: jsonSchema(definition.inputSchema),
        outputSchema: jsonSchema(definition.outputSchema),
      }),
    ]),
  );
}
