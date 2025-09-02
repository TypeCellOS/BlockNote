import { DefaultChatTransport, readUIMessageStream } from "ai";
import { OperationsResult } from "../../../api/LLMResponse.js";
import {
  createAsyncIterableStream,
  createAsyncIterableStreamFromAsyncIterable,
} from "../../../util/stream.js";
import { filterNewOrUpdatedOperations } from "../../filterNewOrUpdatedOperations.js";
import { preprocessOperationsStreaming } from "../../preprocess.js";
import { StreamTool, StreamToolCall } from "../../streamTool.js";
import {
  uiMessageStreamToTextStream,
  textStreamToPartialObjectStream,
} from "./partialObjectStreamUtil.js";

export async function dataStreamResponseToOperationsResult<
  T extends StreamTool<any>[],
>(
  response: Response,
  streamTools: T,
  onStart: () => void = () => {
    // noop
  },
): Promise<OperationsResult<T>> {

  const transport = new DefaultChatTransport();
  transport.
  const ret = uiMessageStreamToTextStream(response.body!).pipeThrough(
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
