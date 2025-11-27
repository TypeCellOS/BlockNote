import { describe, expect, it } from "vitest";
import { createAppendableStream } from "./appendableStream.js";

async function collectStream<T>(stream: ReadableStream<T>): Promise<T[]> {
  const reader = stream.getReader();
  const results: T[] = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
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

    // Create a stream that never ends and provides no data
    const infiniteStream = new ReadableStream<string>({
      start() {},
    });

    append(infiniteStream);

    // Cancel the output stream after a short delay
    setTimeout(() => {
      output.cancel("cancelled");
    }, 100);

    // finalize should resolve (or reject) eventually, not hang forever
    // We use a timeout to fail the test if it hangs
    const result = await Promise.race([
      finalize().then(() => "finished"),
      new Promise((resolve) => setTimeout(() => resolve("timeout"), 1000)),
    ]);

    expect(result).toBe("finished");
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

    append(stream);
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

    append(stream1);
    append(stream2);
    await finalize();

    const results = await collectStream(output);
    expect(results).toEqual([1, 2, 3, 4]);
  });

  it("should handle async streams that produce data over time", async () => {
    const { output, append, finalize } = createAppendableStream<number>();

    const stream = new ReadableStream<number>({
      start(controller) {
        let count = 0;
        const interval = setInterval(() => {
          count++;
          controller.enqueue(count);
          if (count >= 3) {
            clearInterval(interval);
            controller.close();
          }
        }, 10);
      },
    });

    append(stream);
    await finalize();

    const results = await collectStream(output);
    expect(results).toEqual([1, 2, 3]);
  });

  it("should handle errors from appended streams", async () => {
    const { output, append, finalize } = createAppendableStream<number>();

    const stream = new ReadableStream<number>({
      start(controller) {
        controller.enqueue(1);
        controller.error(new Error("stream error"));
      },
    });

    append(stream);

    // finalize resolves even when there's an error
    await finalize();

    // The output stream should be errored
    const reader = output.getReader();
    await expect(reader.read()).rejects.toThrow("stream error");
    reader.releaseLock();
  });

  it("should throw when appending to a canceled stream", async () => {
    const { output, append } = createAppendableStream<number>();

    output.cancel("cancelled");

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

    const slowStream = new ReadableStream<number>({
      start(controller) {
        setTimeout(() => {
          controller.enqueue(1);
          controller.close();
        }, 100);
      },
    });

    const appendPromise = append(slowStream);

    // Cancel before the stream finishes
    output.cancel("cancelled");

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

    const slowStream = new ReadableStream<string>({
      start(controller) {
        setTimeout(() => {
          controller.enqueue("slow");
          controller.close();
        }, 50);
      },
    });

    append(slowStream);
    append(fastStream);
    await finalize();

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

    append(emptyStream);
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

    append(empty1);
    append(empty2);
    await finalize();

    const results = await collectStream(output);
    expect(results).toEqual([]);
  });
});
