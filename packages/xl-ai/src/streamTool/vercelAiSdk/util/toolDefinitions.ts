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

export async function toolSetToToolDefinitions(
  toolSet: ToolSet,
): Promise<ToolDefinitions> {
  const entries = await Promise.all(
    Object.entries(toolSet).map(async ([name, tool]) => [
      name,
      {
        description: tool.description,
        inputSchema: await asSchema(tool.inputSchema).jsonSchema,
        outputSchema: await asSchema(tool.outputSchema).jsonSchema,
      },
    ]),
  );

  return Object.fromEntries(entries);
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
