import { describe, expect, it, vi } from "vite-plus/test";
import { createEmbedResolver } from "./index.js";

function request(signal?: AbortSignal) {
  return new Request(
    "https://app.test/oembed?url=https%3A%2F%2Fsource.test%2Fpost",
    {
      signal,
      headers: { Authorization: "private", Cookie: "private" },
    },
  );
}

describe("resolver operation boundary", () => {
  it.each([false, true])(
    "forwards incoming cancellation (already aborted: %s)",
    async (alreadyAborted) => {
      const controller = new AbortController();
      let started!: (request: Request) => void;
      const upstream = new Promise<Request>((resolve) => {
        started = resolve;
      });
      const protectedFetch = vi.fn((outbound: Request) => {
        started(outbound);
        return new Promise<Response>((_resolve, reject) => {
          outbound.signal.addEventListener(
            "abort",
            () => reject(outbound.signal.reason),
            { once: true },
          );
        });
      });
      if (alreadyAborted) {
        controller.abort(new Error("private cancellation detail"));
      }
      const pending = createEmbedResolver({ protectedFetch }).fetch(
        request(controller.signal),
      );
      if (alreadyAborted) {
        expect(protectedFetch).not.toHaveBeenCalled();
      } else {
        const outbound = await upstream;
        controller.abort(new Error("private cancellation detail"));
        expect(outbound.signal.aborted).toBe(true);
      }
      const response = await pending;
      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({
        type: "link",
        title: "https://source.test/post",
      });
    },
  );

  it("rebuilds credential-free requests on redirects and enforces the redirect bound", async () => {
    const protectedFetch = vi.fn(
      async (_request: Request) =>
        new Response(null, {
          status: 302,
          headers: { Location: "https://other.test/again" },
        }),
    );
    const response = await createEmbedResolver({
      protectedFetch,
      maxRedirects: 1,
    }).fetch(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      type: "link",
      title: "https://source.test/post",
    });
    expect(protectedFetch).toHaveBeenCalledTimes(2);
    expect(protectedFetch.mock.calls[1][0].url).toBe(
      "https://other.test/again",
    );
    for (const [outbound] of protectedFetch.mock.calls) {
      expect(outbound.redirect).toBe("manual");
      expect(outbound.headers.has("authorization")).toBe(false);
      expect(outbound.headers.has("cookie")).toBe(false);
    }
  });

  it("uses protectedFetch for discovered internal URLs and never exposes its diagnostic", async () => {
    const protectedFetch = vi
      .fn(async (_request: Request): Promise<Response> => {
        throw new TypeError("blocked private IP");
      })
      .mockResolvedValueOnce(
        new Response(
          '<link rel=alternate type="application/json+oembed" href="http://127.0.0.1/oembed">',
          { headers: { "Content-Type": "text/html" } },
        ),
      );
    const response = await createEmbedResolver({ protectedFetch }).fetch(
      request(),
    );
    expect(protectedFetch.mock.calls[1][0].url).toContain(
      "http://127.0.0.1/oembed",
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      type: "link",
      title: "source.test",
    });
  });

  it("rejects credential-bearing redirect destinations before the next fetch", async () => {
    const protectedFetch = vi.fn(
      async () =>
        new Response(null, {
          status: 302,
          headers: { Location: "https://user:secret@other.test/" },
        }),
    );
    expect(
      (await createEmbedResolver({ protectedFetch }).fetch(request())).status,
    ).toBe(200);
    expect(protectedFetch).toHaveBeenCalledTimes(1);
  });

  it("shares one native timeout signal across source and discovered fetch", async () => {
    const protectedFetch = vi.fn(async (outbound: Request) => {
      if (new URL(outbound.url).pathname === "/post") {
        return new Response(
          '<link rel=alternate type="application/json+oembed" href="/provider">',
          {
            headers: { "Content-Type": "text/html" },
          },
        );
      }
      return new Promise<Response>((_resolve, reject) => {
        outbound.signal.addEventListener(
          "abort",
          () => reject(outbound.signal.reason),
          { once: true },
        );
      });
    });
    const response = await createEmbedResolver({
      protectedFetch,
      timeoutMs: 10,
    }).fetch(request());
    expect(protectedFetch).toHaveBeenCalledTimes(2);
    expect(response.status).toBe(200);
    const [source, provider] = protectedFetch.mock.calls.map(
      ([outbound]) => outbound.signal,
    );
    expect(source.aborted).toBe(true);
    expect(provider.aborted).toBe(true);
    expect(source.reason).toBe(provider.reason);
    expect(source.reason.name).toBe("TimeoutError");
  });

  it("propagates programmer errors instead of turning them into unavailable results", async () => {
    const bug = new Error("broken invariant");
    await expect(
      createEmbedResolver({
        protectedFetch() {
          throw bug;
        },
      }).fetch(request()),
    ).rejects.toBe(bug);
  });
});
