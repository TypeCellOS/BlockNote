import { jsonSchema, JSONSchema7, tool } from "ai";

export function toolDefinitionsToToolSet(
  toolDefinitions: Record<
    string,
    {
      name: string;
      description?: string;
      inputSchema: JSONSchema7;
      outputSchema: JSONSchema7;
    }
  >,
) {
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
