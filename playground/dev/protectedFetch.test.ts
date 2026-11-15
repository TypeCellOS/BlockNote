import { PassThrough } from "node:stream";
import { createGunzip } from "node:zlib";
import fetch, { Response as NodeResponse } from "node-fetch";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { protectedFetch } from "./protectedFetch.js";

vi.mock("node-fetch", async (importOriginal) => ({
  ...(await importOriginal<typeof import("node-fetch")>()),
  default: vi.fn(),
}));

describe("development Node-to-web transport adapter", () => {
  beforeEach(() => vi.mocked(fetch).mockReset());

  it("returns before body completion, strips browser credentials and cancels the Node stream", async () => {
    const body = new PassThrough();
    body.write("<head><title>Small head</title></head>");
    vi.mocked(fetch).mockResolvedValue(new NodeResponse(body));
    const response = await protectedFetch(
      new Request("https://source.test/page", {
        headers: {
          Authorization: "private",
          Cookie: "private",
          Accept: "text/html",
        },
      }),
    );
    expect(body.readableEnded).toBe(false);
    const reader = response.body!.getReader();
    expect((await reader.read()).value).toBeInstanceOf(Uint8Array);
    await reader.cancel();
    expect(body.destroyed).toBe(true);
    expect(vi.mocked(fetch).mock.calls[0][1]).toMatchObject({
      method: "GET",
      redirect: "manual",
      headers: { Accept: "text/html" },
    });
    expect(vi.mocked(fetch).mock.calls[0][1]?.agent).toBeTruthy();
  });

  it("adapts real decoder failures after headers to the portable fetch failure contract", async () => {
    const body = createGunzip();
    vi.mocked(fetch).mockResolvedValue(new NodeResponse(body));
    const response = await protectedFetch(new Request("https://source.test"));
    const assertion = expect(response.text()).rejects.toMatchObject({
      name: "TypeError",
      cause: { code: "Z_DATA_ERROR" },
    });
    body.end(Buffer.from("not gzip"));
    await assertion;
  });

  it("adapts socket failures but preserves unrecognized coded errors rather than hiding bugs", async () => {
    for (const code of ["ECONNRESET", "Z_STREAM_ERROR"]) {
      const body = new PassThrough();
      vi.mocked(fetch).mockResolvedValue(new NodeResponse(body));
      const response = await protectedFetch(new Request("https://source.test"));
      const failure = Object.assign(new Error("stream failed"), { code });
      const pending = response.body!.getReader().read();
      body.destroy(failure);
      if (code === "ECONNRESET") {
        await expect(pending).rejects.toBeInstanceOf(TypeError);
      } else {
        await expect(pending).rejects.toBe(failure);
      }
    }
  });

  it("destroys redirect bodies instead of leaking a Node stream while portable code follows Location", async () => {
    const body = new PassThrough();
    vi.mocked(fetch).mockResolvedValue(
      new NodeResponse(body, { status: 302, headers: { Location: "/final" } }),
    );
    const response = await protectedFetch(new Request("https://source.test"));
    expect(response.body).toBeNull();
    expect(body.destroyed).toBe(true);
    expect(response.headers.get("location")).toBe("/final");
  });
});
