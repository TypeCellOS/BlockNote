/**
 * Creates an appendable stream that allows multiple ReadableStreams to be
 * appended sequentially. The streams are processed one after another, and
 * all data is forwarded to a single output ReadableStream.
 *
 * This is useful when you need to combine multiple streams that arrive
 * asynchronously into a single continuous stream.
 */
export function createAppendableStream<T>() {
  let controller: ReadableStreamDefaultController<T>;
  let ready = Promise.resolve();
  let canceled = false;
  let onCancel: ((reason: any) => void) | undefined;
  const cancelPromise = new Promise<never>((_, reject) => {
    onCancel = reject;
  });
  // Ensure cancelPromise rejections are always handled to avoid unhandled rejection warnings
  cancelPromise.catch(() => {
    // Rejection is handled by Promise.race in the append function
  });

  const output = new ReadableStream({
    start(c) {
      controller = c;
    },
    cancel(reason) {
      canceled = true;
      controller.error(reason);
      onCancel?.(reason);
    },
  });

  async function append(readable: ReadableStream<T>) {
    if (canceled) {
      throw new Error("Appendable stream canceled, can't append");
    }
    const reader = readable.getReader();

    // Chain appends in sequence
    ready = ready.then(async () => {
      // eslint-disable-next-line no-constant-condition
      while (true) {
        try {
          const { done, value } = await Promise.race([
            reader.read(),
            cancelPromise,
          ]);
          if (done || canceled) {
            break;
          }
          controller.enqueue(value);
        } catch (e) {
          canceled = true;
          controller.error(e);
          break;
        }
      }
    });

    return ready;
  }

  async function finalize() {
    await ready; // wait for last appended stream to finish

    if (!canceled) {
      controller.close(); // only close once no more streams will come
    }
  }

  return { output, append, finalize };
}
