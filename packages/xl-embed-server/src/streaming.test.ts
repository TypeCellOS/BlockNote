import { describe, expect, it, vi } from "vite-plus/test";
import { createEmbedResolver } from "./index.js";

const incoming = new Request(
  "https://app.test/oembed?url=https%3A%2F%2Fsource.test%2Fpost",
);
function response(chunks: (string | Uint8Array)[], type = "text/html") {
  const cancel = vi.fn();
  let index = 0;
  const stream = new ReadableStream<Uint8Array>(
    {
      pull(controller) {
        if (index === chunks.length) {
          controller.close();
        } else {
          const chunk = chunks[index++];
          controller.enqueue(
            typeof chunk === "string" ? new TextEncoder().encode(chunk) : chunk,
          );
        }
      },
      cancel,
    },
    { highWaterMark: 0 },
  );
  return {
    value: new Response(stream, { headers: { "Content-Type": type } }),
    cancel,
    consumed: () => index,
  };
}

describe("bounded incremental head reading", () => {
  it("carries depth across chunks and cancels before quadratic unmatched-close input", async () => {
    const upstream = response([
      "<head>" + "<x>".repeat(126),
      "<x>",
      "</y>".repeat(60000),
    ]);
    const result = await createEmbedResolver({
      protectedFetch: async () => upstream.value,
    }).fetch(incoming);
    expect(result.status).toBe(200);
    expect(await result.json()).toMatchObject({
      type: "link",
      title: "https://source.test/post",
    });
    expect(upstream.cancel).toHaveBeenCalled();
    expect(upstream.consumed()).toBe(2);
  });

  it("ignores raw-text/comment/quoted fake boundaries, then cancels before the body", async () => {
    const head = `<head><!-- </head><body> -->
      <script>const x = "</head><body>";</script>
      <meta name=description content="Quoted </head> and <body>">
      <textarea><meta property=og:title content=Fake></head></textarea>
      <title>Correct</title></head>`;
    const upstream = response([
      ...head.split(""),
      "<body>" + "x".repeat(1024 * 1024),
    ]);
    const result = await createEmbedResolver({
      protectedFetch: async () => upstream.value,
    }).fetch(incoming);
    expect(await result.json()).toMatchObject({
      title: "Correct",
      description: "Quoted </head> and <body>",
    });
    expect(upstream.consumed()).toBe(head.length);
    expect(upstream.cancel).toHaveBeenCalled();
  });

  it("counts decoded UTF-8 bytes yet accepts an exact-cap head before a huge same-chunk body", async () => {
    const head = "<head><title>🦋 é</title></head>";
    for (const offset of [0, -1]) {
      const upstream = response([head + "<body>" + "x".repeat(1024 * 1024)]);
      const result = await createEmbedResolver({
        protectedFetch: async () => upstream.value,
        maxResponseBytes: new TextEncoder().encode(head).byteLength + offset,
      }).fetch(incoming);
      expect(result.status).toBe(200);
      if (offset === 0) {
        expect(await result.json()).toMatchObject({ title: "🦋 é" });
      } else {
        expect(await result.json()).toMatchObject({
          type: "link",
          title: "https://source.test/post",
        });
      }
      expect(upstream.consumed()).toBe(1);
      expect(upstream.cancel).toHaveBeenCalled();
    }
  });

  it("bounds complete JSON independently of headers and cancels the unread tail", async () => {
    const upstream = response(
      ['{"value":"' + "x".repeat(400), "unused"],
      "application/json",
    );
    upstream.value.headers.set("Content-Length", "1");
    const result = await createEmbedResolver({
      protectedFetch: async () => upstream.value,
      maxResponseBytes: 200,
    }).fetch(incoming);
    expect(result.status).toBe(200);
    expect(await result.json()).toMatchObject({
      type: "link",
      title: "https://source.test/post",
    });
    expect(upstream.cancel).toHaveBeenCalled();
    expect(upstream.consumed()).toBe(1);
  });

  it("applies the operation deadline to stalled body reads, not just fetch headers", async () => {
    const cancel = vi.fn();
    const pending = createEmbedResolver({
      protectedFetch: async () =>
        new Response(new ReadableStream<Uint8Array>({ cancel }), {
          headers: { "Content-Type": "text/html" },
        }),
      timeoutMs: 10,
    }).fetch(incoming);
    expect((await pending).status).toBe(200);
    expect(cancel).toHaveBeenCalled();
  });
});
