import { UIMessageChunk } from "ai";
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

export async function UIMessageStreamToOperationsResult<
  T extends StreamTool<any>[],
>(
  stream: ReadableStream<UIMessageChunk>,
  streamTools: T,
  onStart: () => void = () => {
    // noop
  },
): Promise<OperationsResult<T>> {
  const ret = uiMessageStreamObjectDataToTextStream(stream).pipeThrough(
    textStreamToPartialObjectStream<{ operations: StreamToolCall<T>[] }>(),
  );

  // Note: we can probably clean this up by switching to streams instead of async iterables
  return createAsyncIterableStreamFromAsyncIterable(
    preprocessOperationsStreaming(
      filterNewOrUpdatedOperations(
        streamOnStartCallback(createAsyncIterableStream(ret), onStart),
      ),
      streamTools,
    ),
  );
}

async function* streamOnStartCallback<T>(
  stream: AsyncIterable<T>,
  onStart: () => void,
): AsyncIterable<T> {
  let first = true;
  for await (const chunk of stream) {
    if (first) {
      onStart();
      first = false;
    }
    yield chunk;
  }
}
