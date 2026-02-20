import { DeepPartial } from "ai";
import {
  createAsyncIterableStream,
  createAsyncIterableStreamFromAsyncIterable,
} from "../../../util/stream.js";
import {
  filterNewOrUpdatedCalls,
  filterNewOrUpdatedOperations,
} from "../../operations/filterNewOrUpdatedOperations.js";
import { preprocessOperationsStreaming } from "../../preprocess.js";
import { StreamTool, StreamToolCall } from "../../streamTool.js";

import { AsyncIterableStream } from "../../../util/stream.js";

/**
 * Result of an LLM call with stream tools
 */
type OperationsResult<T extends StreamTool<any>[]> = AsyncIterableStream<{
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

  metadata: any;
}>;

export function operationsObjectStreamToOperationsResult<
  T extends StreamTool<any>[],
>(
  stream: ReadableStream<DeepPartial<{ operations: StreamToolCall<T>[] }>>,
  streamTools: T,
  chunkMetadata: any,
): OperationsResult<T> {
  // Note: we can probably clean this up by switching to streams instead of async iterables
  return createAsyncIterableStreamFromAsyncIterable(
    preprocessOperationsStreaming(
      filterNewOrUpdatedOperations(
        createAsyncIterableStream(stream),
        chunkMetadata,
      ),
      streamTools,
    ),
  );
}

export function objectStreamToOperationsResult<T extends StreamTool<any>[]>(
  stream: ReadableStream<DeepPartial<T>>,
  streamTools: T,
  chunkMetadata: any,
): OperationsResult<T> {
  // Note: we can probably clean this up by switching to streams instead of async iterables
  return createAsyncIterableStreamFromAsyncIterable(
    preprocessOperationsStreaming(
      filterNewOrUpdatedCalls(createAsyncIterableStream(stream), chunkMetadata),
      streamTools,
    ),
  );
}
