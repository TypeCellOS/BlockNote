import { describe, expect, it } from "vite-plus/test";
import { createAppendableStream } from "./appendableStream.js";

async function collectStream<T>(stream: ReadableStream<T>): Promise<T[]> {
  const reader = stream.getReader();
  const results: T[] = [];
  try {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      results.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return results;
}

describe("createAppendableStream", () => {
  it("should not hang if output is canceled while waiting for input", async () => {
    const { output, append, finalize } = createAppendableStream<string>();

    const readStarted = Promise.withResolvers<void>();
    // Signal when the reader is waiting for data, without producing any.
    const infiniteStream = new ReadableStream<string>(
      {
        pull() {
          readStarted.resolve();
        },
      },
      { highWaterMark: 0 },
    );

    void append(infiniteStream);
    const finished = finalize();
    await readStarted.promise;
    await output.cancel("cancelled");
    await finished;
  });

  it("should forward data from a single stream", async () => {
    const { output, append, finalize } = createAppendableStream<number>();

    const stream = new ReadableStream<number>({
      start(controller) {
        controller.enqueue(1);
        controller.enqueue(2);
        controller.enqueue(3);
        controller.close();
      },
    });

    void append(stream);
    await finalize();

    const results = await collectStream(output);
    expect(results).toEqual([1, 2, 3]);
  });

  it("should forward data from multiple streams sequentially", async () => {
    const { output, append, finalize } = createAppendableStream<number>();

    const stream1 = new ReadableStream<number>({
      start(controller) {
        controller.enqueue(1);
        controller.enqueue(2);
        controller.close();
      },
    });

    const stream2 = new ReadableStream<number>({
      start(controller) {
        controller.enqueue(3);
        controller.enqueue(4);
        controller.close();
      },
    });

    void append(stream1);
    void append(stream2);
    await finalize();

    const results = await collectStream(output);
    expect(results).toEqual([1, 2, 3, 4]);
  });

  it("should handle async streams that produce data over time", async () => {
    const { output, append, finalize } = createAppendableStream<number>();

    const values = Array.from({ length: 3 }, () =>
      Promise.withResolvers<number>(),
    );
    let index = 0;
    const stream = new ReadableStream<number>({
      async pull(controller) {
        controller.enqueue(await values[index++].promise);
        if (index === values.length) {
          controller.close();
        }
      },
    });

    void append(stream);
    const reader = output.getReader();
    for (const [index, value] of values.entries()) {
      const next = reader.read();
      value.resolve(index + 1);
      await expect(next).resolves.toEqual({ done: false, value: index + 1 });
    }
    await finalize();
    await expect(reader.read()).resolves.toMatchObject({ done: true });
    reader.releaseLock();
  });

  it("should handle errors from appended streams", async () => {
    const { output, append, finalize } = createAppendableStream<number>();

    const stream = new ReadableStream<number>({
      start(controller) {
        controller.enqueue(1);
        controller.error(new Error("stream error"));
      },
    });

    void append(stream);

    // finalize resolves even when there's an error
    await finalize();

    // The output stream should be errored
    const reader = output.getReader();
    await expect(reader.read()).rejects.toThrow("stream error");
    reader.releaseLock();
  });

  it("should throw when appending to a canceled stream", async () => {
    const { output, append } = createAppendableStream<number>();

    void output.cancel("cancelled");

    const stream = new ReadableStream<number>({
      start(controller) {
        controller.enqueue(1);
        controller.close();
      },
    });

    await expect(append(stream)).rejects.toThrow(
      "Appendable stream canceled, can't append",
    );
  });

  it("should handle cancellation during stream processing", async () => {
    const { output, append, finalize } = createAppendableStream<number>();

    const slowStream = new ReadableStream<number>();

    const appendPromise = append(slowStream);

    // Cancel before the stream finishes
    void output.cancel("cancelled");

    // The append promise should resolve (cancellation is handled internally)
    await appendPromise;

    // finalize should still resolve (not hang)
    await finalize();
  });

  it("should process multiple streams in order even if they complete at different times", async () => {
    const { output, append, finalize } = createAppendableStream<string>();

    const fastStream = new ReadableStream<string>({
      start(controller) {
        controller.enqueue("fast");
        controller.close();
      },
    });

    const releaseSlowStream = Promise.withResolvers<void>();
    const slowStream = new ReadableStream<string>({
      async pull(controller) {
        await releaseSlowStream.promise;
        controller.enqueue("slow");
        controller.close();
      },
    });

    void append(slowStream);
    void append(fastStream);
    const finished = finalize();
    releaseSlowStream.resolve();
    await finished;

    const results = await collectStream(output);
    expect(results).toEqual(["slow", "fast"]);
  });

  it("should handle empty streams", async () => {
    const { output, append, finalize } = createAppendableStream<number>();

    const emptyStream = new ReadableStream<number>({
      start(controller) {
        controller.close();
      },
    });

    void append(emptyStream);
    await finalize();

    const results = await collectStream(output);
    expect(results).toEqual([]);
  });

  it("should handle multiple empty streams", async () => {
    const { output, append, finalize } = createAppendableStream<number>();

    const empty1 = new ReadableStream<number>({
      start(controller) {
        controller.close();
      },
    });

    const empty2 = new ReadableStream<number>({
      start(controller) {
        controller.close();
      },
    });

    void append(empty1);
    void append(empty2);
    await finalize();

    const results = await collectStream(output);
    expect(results).toEqual([]);
  });
});
