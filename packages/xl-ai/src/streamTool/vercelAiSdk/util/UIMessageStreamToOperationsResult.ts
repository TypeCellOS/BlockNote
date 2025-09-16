import { DeepPartial, UIMessageChunk } from "ai";
import { OperationsResult } from "../../../api/LLMResponse.js";
import {
  createAsyncIterableStream,
  createAsyncIterableStreamFromAsyncIterable,
} from "../../../util/stream.js";
import { filterNewOrUpdatedOperations } from "../../filterNewOrUpdatedOperations.js";
import { preprocessOperationsStreaming } from "../../preprocess.js";
import { StreamTool, StreamToolCall } from "../../streamTool.js";
import {
  textStreamToPartialObjectStream,
  uiMessageStreamObjectDataToTextStream,
} from "./partialObjectStreamUtil.js";

// stream vs generate, responsibility of backend
// text vs object,

export function UIMessageStreamToOperationsResult<T extends StreamTool<any>[]>(
  stream: ReadableStream<UIMessageChunk>,
  streamTools: T,
): OperationsResult<T> {
  const ret = uiMessageStreamObjectDataToTextStream(stream).pipeThrough(
    textStreamToPartialObjectStream<{ operations: StreamToolCall<T>[] }>(),
  );

  // Note: we can probably clean this up by switching to streams instead of async iterables
  return objectStreamToOperationsResult(ret, streamTools);
}

export function objectStreamToOperationsResult<T extends StreamTool<any>[]>(
  stream: ReadableStream<DeepPartial<{ operations: StreamToolCall<T>[] }>>,
  streamTools: T,
): OperationsResult<T> {
  // Note: we can probably clean this up by switching to streams instead of async iterables
  return createAsyncIterableStreamFromAsyncIterable(
    preprocessOperationsStreaming(
      filterNewOrUpdatedOperations(createAsyncIterableStream(stream)),
      streamTools,
    ),
  );
}
