import { jsonSchema, tool } from "ai";
import { operationsToStream } from "./callLLMWithStreamTools.js";
import { createStreamToolsArraySchema } from "./jsonSchema.js";
import { StreamTool } from "./streamTool.js";

// TODO: remove or implement

export function streamToolAsTool<T extends StreamTool<any>>(streamTool: T) {
  return tool({
    parameters: jsonSchema(streamTool.parameters, {
      validate: (value) => {
        const result = streamTool.validate(value);
        if (!result.ok) {
          return { success: false, error: new Error(result.error) };
        }
        return { success: true, value: result.value };
      },
    }),
    execute: async (_value) => {
      // console.log("execute", value);
      // TODO
    },
  });
}

export function streamToolsAsTool<T extends StreamTool<any>[]>(streamTools: T) {
  const schema = createStreamToolsArraySchema(streamTools);

  return tool({
    parameters: jsonSchema(schema, {
      validate: (value) => {
        const stream = operationsToStream(value);
        if (!stream.ok) {
          return { success: false, error: new Error(stream.error) };
        }
        return { success: true, value: stream.value };
      },
    }),
    execute: async (_value) => {
      // TODO
      // console.log("execute", value);
    },
  });
}
