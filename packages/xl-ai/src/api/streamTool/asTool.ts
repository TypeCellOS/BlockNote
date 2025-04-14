import { jsonSchema, tool } from "ai";
import { operationsToStream } from "./callLLMWithStreamTools.js";
import { createStreamToolsArraySchema } from "./jsonSchema.js";
import { StreamTool } from "./streamTool.js";

export function streamToolAsTool<T extends StreamTool<any>>(streamTool: T) {
  return tool({
    parameters: jsonSchema(streamTool.parameters, {
      validate: (value) => {
        const result = streamTool.validate(value);
        if (result.result === "invalid") {
          return { success: false, error: new Error(result.reason) };
        }
        return { success: true, value: result.value };
      },
    }),
    execute: async (value) => {
      console.log("execute", value)
      // TODO
    }
  })
}

export function streamToolsAsTool<T extends StreamTool<any>[]>(streamTools: T) {
  const schema = createStreamToolsArraySchema(streamTools);

  return tool({
    parameters: jsonSchema(schema, {
      validate: (value) => {
        const stream = operationsToStream(value);
        if (stream.result === "invalid") {
          return { success: false, error: new Error(stream.reason) };
        }
        return { success: true, value: stream.value };
      }
    }),
    execute: async (value) => {
      // TODO
      console.log("execute", value)
    }
  })
}