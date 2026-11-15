import { IncomingMessage, ServerResponse } from "node:http";
import { Socket } from "node:net";
import { createEmbedResolver } from "@blocknote/xl-embed-server";
import type { Connect, ViteDevServer } from "vite-plus";
import { describe, expect, it, vi } from "vite-plus/test";
import { embedDemo, localRequestUrl } from "./embeds.js";
import { protectedFetch } from "./protectedFetch.js";

vi.mock("@blocknote/xl-embed-server", () => ({ createEmbedResolver: vi.fn() }));

async function middlewareFixture() {
  let resolve!: (response: Response) => void;
  let reject!: (error: Error) => void;
  const pending = new Promise<Response>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  const fetch = vi.fn((_request: Request) => pending);
  vi.mocked(createEmbedResolver).mockReturnValue({ fetch });
  const use = vi.fn<(handler: Connect.NextHandleFunction) => void>();
  const configure = embedDemo().configureServer;
  if (typeof configure !== "function") {
    throw new Error("Expected a configureServer hook");
  }
  // This hook uses only middleware registration, not the Vite plugin context.
  await configure.call(
    {} as ThisParameterType<typeof configure>,
    { middlewares: { use } } as unknown as ViteDevServer,
  );
  const request = new IncomingMessage(new Socket());
  Object.defineProperties(request.socket, {
    remoteAddress: { value: "127.0.0.1" },
    localPort: { value: 5175 },
  });
  request.headers = browserRequest().headers;
  request.url = browserRequest().url;
  request.method = "GET";
  const response = new ServerResponse(request);
  const writeHead = vi.spyOn(response, "writeHead");
  const end = vi.spyOn(response, "end");
  const next = vi.fn();
  use.mock.calls[0][0](request, response, next);
  return { request, response, writeHead, end, next, fetch, resolve, reject };
}

describe("development response lifecycle", () => {
  it.each(["resolve", "own-abort", "foreign-abort"] as const)(
    "aborts on premature response close and handles late %s",
    async (settlement) => {
      const fixture = await middlewareFixture();
      const signal = fixture.fetch.mock.calls[0][0].signal;
      fixture.response.destroy();
      fixture.response.emit("close");
      const cleanup = vi.spyOn(fixture.response, "removeListener");
      expect(signal.aborted).toBe(true);
      const failure =
        settlement === "own-abort"
          ? signal.reason
          : new DOMException("unrelated cancellation", "AbortError");
      if (settlement === "resolve") {
        fixture.resolve(new Response("late"));
      } else {
        fixture.reject(failure);
      }
      await vi.waitFor(() =>
        expect(cleanup).toHaveBeenCalledWith("close", expect.any(Function)),
      );
      expect(fixture.writeHead).not.toHaveBeenCalled();
      expect(fixture.end).not.toHaveBeenCalled();
      if (settlement === "foreign-abort") {
        expect(fixture.next).toHaveBeenCalledExactlyOnceWith(failure);
      } else {
        expect(fixture.next).not.toHaveBeenCalled();
      }
    },
  );

  it("does not abort when the incoming GET ends or the response completes normally", async () => {
    const fixture = await middlewareFixture();
    const signal = fixture.fetch.mock.calls[0][0].signal;
    fixture.end.mockImplementationOnce((text) => {
      const result = ServerResponse.prototype.end.call(
        fixture.response,
        text,
        "utf8",
      );
      fixture.response.emit("close");
      return result;
    });
    fixture.request.emit("end");
    fixture.request.emit("close");
    expect(signal.aborted).toBe(false);
    fixture.resolve(new Response("done"));
    await vi.waitFor(() => expect(fixture.end).toHaveBeenCalledWith("done"));
    fixture.response.emit("close");
    expect(signal.aborted).toBe(false);
    expect(fixture.response.listenerCount("close")).toBe(0);
    expect(fixture.next).not.toHaveBeenCalled();
  });

  it("does not write if the client disconnects while the result body is read", async () => {
    const fixture = await middlewareFixture();
    let finish!: () => void;
    const body = new ReadableStream({
      start(controller) {
        finish = () => controller.close();
      },
    });
    fixture.resolve(new Response(body));
    await vi.waitFor(() => expect(body.locked).toBe(true));
    fixture.response.destroy();
    fixture.response.emit("close");
    const cleanup = vi.spyOn(fixture.response, "removeListener");
    finish();
    await vi.waitFor(() =>
      expect(cleanup).toHaveBeenCalledWith("close", expect.any(Function)),
    );
    expect(fixture.writeHead).not.toHaveBeenCalled();
    expect(fixture.end).not.toHaveBeenCalled();
    expect(fixture.next).not.toHaveBeenCalled();
  });
});

function browserRequest() {
  return {
    url: "/__embeds/oembed?url=https://bookhive.buzz",
    socket: { remoteAddress: "127.0.0.1", localPort: 5175 },
    headers: {
      host: "localhost:5175",
      referer: "http://localhost:5175/extensions/embeds",
      "sec-fetch-site": "same-origin",
    },
  };
}

describe("local embed demo boundary", () => {
  it("allows same-origin loopback browsers only", () => {
    expect(localRequestUrl(browserRequest())?.pathname).toBe(
      "/__embeds/oembed",
    );
    const remote = browserRequest();
    remote.socket.remoteAddress = "192.168.1.5";
    expect(localRequestUrl(remote)).toBeUndefined();
    const rebinding = browserRequest();
    rebinding.headers.host = "attacker.example:5175";
    expect(localRequestUrl(rebinding)).toBeUndefined();
    const crossOrigin = browserRequest();
    crossOrigin.headers.referer = "https://attacker.example/";
    expect(localRequestUrl(crossOrigin)).toBeUndefined();
    const origin = browserRequest();
    expect(
      localRequestUrl({
        ...origin,
        headers: { ...origin.headers, origin: "https://attacker.example" },
      }),
    ).toBeUndefined();
    const crossSite = browserRequest();
    crossSite.headers["sec-fetch-site"] = "cross-site";
    expect(localRequestUrl(crossSite)).toBeUndefined();
    const wrongPort = browserRequest();
    wrongPort.headers.host = "localhost:9999";
    expect(localRequestUrl(wrongPort)).toBeUndefined();
  });

  it.each(["http://127.0.0.1/", "http://[::1]/", "http://localhost/"])(
    "rejects nonpublic connections to %s",
    async (url) => {
      await expect(
        protectedFetch(
          new Request(url, {
            signal: AbortSignal.timeout(1000),
          }),
        ),
      ).rejects.toMatchObject({
        name: "TypeError",
        cause: { message: expect.stringContaining("not allowed") },
      });
    },
  );
});
