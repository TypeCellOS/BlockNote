import { jsonSchema, tool } from "ai";
import { createStreamToolsArraySchema } from "./jsonSchema.js";
import { Result, StreamTool, StreamToolCall } from "./streamTool.js";

// TODO: remove or implement

export function streamToolAsTool<T extends StreamTool<any>>(streamTool: T) {
  return tool({
    inputSchema: jsonSchema(streamTool.inputSchema, {
      validate: (value) => {
        const result = streamTool.validate(value);
        if (!result.ok) {
          return { success: false, error: new Error(result.error) };
        }
        return { success: true, value: result.value };
      },
    }),
    // execute: async (_value) => {
    //   // console.log("execute", value);
    //   // TODO
    // },
  });
}

export function streamToolsAsTool<T extends StreamTool<any>[]>(streamTools: T) {
  const schema = createStreamToolsArraySchema(streamTools);

  return tool({
    name: "operations",
    inputSchema: jsonSchema(schema, {
      // validate: (value) => {
      //   const stream = operationsToStream(value);
      //   if (!stream.ok) {
      //     return { success: false, error: new Error(stream.error) };
      //   }
      //   return { success: true, value: stream.value };
      // },
    }),
    // execute: async (_value) => {
    //   // TODO
    //   // console.log("execute", value);
    // },
  });
}

// TODO: review
function operationsToStream<T extends StreamTool<any>[]>(
  object: unknown,
): Result<
  AsyncIterable<{
    partialOperation: StreamToolCall<T>;
    isUpdateToPreviousOperation: boolean;
    isPossiblyPartial: boolean;
  }>
> {
  if (
    !object ||
    typeof object !== "object" ||
    !("operations" in object) ||
    !Array.isArray(object.operations)
  ) {
    return {
      ok: false,
      error: "No operations returned",
    };
  }
  const operations = object.operations;
  async function* singleChunkGenerator() {
    for (const op of operations) {
      yield {
        partialOperation: op,
        isUpdateToPreviousOperation: false,
        isPossiblyPartial: false,
      };
    }
  }

  return {
    ok: true,
    value: singleChunkGenerator(),
  };
}
