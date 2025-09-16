import { StreamTool, StreamToolCall } from "../streamTool/streamTool.js";
import { AsyncIterableStream } from "../util/stream.js";

/**
 * Result of an LLM call with stream tools
 */
export type OperationsResult<T extends StreamTool<any>[]> =
  AsyncIterableStream<{
    /**
     * The operation the LLM wants to execute
     */
    operation: StreamToolCall<T>;
    /**
     * Whether {@link operation} is an update to the previous operation in the stream.
     *
     * For non-streaming mode, this will always be `false`
     */
    isUpdateToPreviousOperation: boolean;
    /**
     * Whether the {@link operation} is possibly partial (i.e. the LLM is still streaming data about this operation)
     *
     * For non-streaming mode, this will always be `false`
     */
    isPossiblyPartial: boolean;
  }>;
