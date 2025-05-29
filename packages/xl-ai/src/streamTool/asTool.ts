import { jsonSchema, tool } from "ai";
import {
  operationsToStream,
  validateOperationsRoot,
} from "./callLLMWithStreamTools.js";
import { createStreamToolsArraySchema } from "./jsonSchema.js";
import { StreamTool, StreamToolCall } from "./streamTool.js";
import { validateOperation } from "./toValidatedOperations.js";

// TODO: remove or implement

export function streamToolAsTool<T extends StreamTool<{ type: string }>>(
  streamTool: T,
) {
  return tool({
    parameters: jsonSchema(streamTool.parameters, {
      validate: (value) => {
        const result = streamTool.validate(value as any);
        if (!result.ok) {
          return { success: false, error: new Error(result.error) };
        }
        return { success: true, value: result.value as StreamToolCall<T> };
      },
    }),
    execute: async (value) => {
      const currentStream = operationsToStream([value]);
      return streamTool.execute(currentStream);
    },
  });
}

export function streamToolsAsTool<T extends StreamTool<any>[]>(streamTools: T) {
  const schema = createStreamToolsArraySchema(streamTools);

  return tool({
    parameters: jsonSchema(schema, {
      validate: (value) => {
        const operations = validateOperationsRoot(value);
        if (!operations.ok) {
          return { success: false, error: new Error(operations.error) };
        }

        for (const operation of operations.value) {
          const result = validateOperation(operation, streamTools);
          if (!result.ok) {
            return { success: false, error: new Error(result.error) };
          }
        }

        return { success: true, value: operations.value };
      },
    }),
    execute: async (value) => {
      let currentStream = operationsToStream(value);
      for (const tool of streamTools) {
        currentStream = tool.execute(currentStream);
      }
      return currentStream;
    },
  });
}
