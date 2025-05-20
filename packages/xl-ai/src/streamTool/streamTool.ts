import { DeepPartial } from "ai";
import type { JSONSchema7 } from "json-schema";

export type Result<T> =
  | {
      ok: false;
      error: string;
    }
  | { ok: true; value: T };

/**
 * A StreamTool is a function that can be called by the LLM.
 * It's similar to a Tool in the Vercel AI SDK, but:
 *
 * - a collection of StreamTools can be wrapped in a single LLM Tool to issue multiple operations (tool calls) at once.
 * - StreamTools can be used in a streaming manner.
 */
export type StreamTool<T extends { type: string }> = {
  /**
   * The name of the tool
   */
  name: T["type"];
  /**
   * An optional description of the tool that can influence when the tool is picked.
   */
  description?: string;
  /**
   * The schema of the input that the tool expects. The language model will use this to generate the input.
   */
  parameters: JSONSchema7;
  /**
   * Validates the input of the tool call
   *
   * @param operation - The operation to validate.
   * This can be a partial object as the LLM may not have completed the operation yet.
   * The object is not guaranteed to be of type DeepPartial<T> as the LLM might not conform to the schema correctly - so this needs to be validated.
   */
  validate: (operation: DeepPartial<T>) => Result<T>;

  /**
   * Executes tool calls.
   *
   * Note that this operates on the full stream of operations (including other StreamTools calls).
   * This way, we can
   *
   * @returns the stream of operations that have not been processed (and should be passed on to execute handlers of other StreamTools)
   */
  execute: (
    operationsStream: AsyncIterable<{
      operation: StreamToolCall<StreamTool<{ type: string }>[]>;
      isUpdateToPreviousOperation: boolean;
      isPossiblyPartial: boolean;
    }>,
  ) => AsyncIterable<{
    operation: StreamToolCall<StreamTool<{ type: string }>[]>;
    isUpdateToPreviousOperation: boolean;
    isPossiblyPartial: boolean;
  }>;
};

export type StreamToolCallSingle<T extends StreamTool<any>> =
  T extends StreamTool<infer U> ? U : never;

/**
 * A ToolCall represents an invocation of a StreamTool.
 *
 * Its type is the same as what a validated StreamTool returns
 */
export type StreamToolCall<T extends StreamTool<any> | StreamTool<any>[]> =
  T extends StreamTool<infer U>
    ? U
    : // when passed an array of StreamTools, StreamToolCall represents the type of one of the StreamTool invocations
      T extends StreamTool<any>[]
      ? T[number] extends StreamTool<infer V>
        ? V
        : never
      : never;

/**
 * Helper function to create a StreamTool.
 *
 * A StreamTool is a function that can be called by the LLM.
 * It's similar to a Tool in the Vercel AI SDK, but:
 *
 * - a collection of StreamTools can be wrapped in a single LLM Tool to issue multiple operations (tool calls) at once.
 * - StreamTools can be used in a streaming manner.
 */
export function streamTool<T extends { type: string }>(
  config: StreamTool<T>,
): StreamTool<T> {
  // Note: this helper function doesn't do a lot but makes it a bit easier to create a StreamTool
  // and makes it similar to the `tool()` function in the Vercel AI SDK.
  return config;
}
