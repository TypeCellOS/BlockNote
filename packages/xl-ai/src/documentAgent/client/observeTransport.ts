import type { ChatTransport, UIMessage, UIMessageChunk } from "ai";

/**
 * Wraps a transport: the listener sees each chunk of the UI message stream
 * before the chat does. The extension uses it for the answer of the agent,
 * and a mode uses it for its data in the stream (for example the batches
 * of a proposal). It is the same for each transport and each mode.
 */
export function observeTransport(
  transport: ChatTransport<UIMessage>,
  onChunk: (chunk: UIMessageChunk) => void,
): ChatTransport<UIMessage> {
  function observed(stream: ReadableStream<UIMessageChunk>) {
    return stream.pipeThrough(
      new TransformStream<UIMessageChunk, UIMessageChunk>({
        transform(chunk, controller) {
          onChunk(chunk);
          controller.enqueue(chunk);
        },
      }),
    );
  }
  return {
    // A transport that gives a run from its start tells the chat.
    ...(transport.resumeStreamIsReplay === undefined
      ? {}
      : { resumeStreamIsReplay: transport.resumeStreamIsReplay }),
    async sendMessages(options) {
      return observed(await transport.sendMessages(options));
    },
    // The stream of a run that this client did not start (see `follow`).
    async reconnectToStream(options) {
      const stream = await transport.reconnectToStream(options);
      return stream === null ? null : observed(stream);
    },
  };
}
