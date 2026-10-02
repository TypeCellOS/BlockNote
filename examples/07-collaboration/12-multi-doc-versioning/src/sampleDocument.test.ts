import { afterEach, beforeEach, expect, it, vi } from "vite-plus/test";
import * as Y from "@y/y";
import { decodeAny } from "lib0/buffer";
import { seedSampleDocument } from "./sampleDocument.js";

beforeEach(() => localStorage.clear());
afterEach(() => {
  localStorage.clear();
  vi.unstubAllGlobals();
});

it.each([false, true])(
  "replays partial seeding without duplicate content or versions (lost response: %s)",
  async (lostResponse) => {
    const remote = new Y.Doc({ gc: false });
    const requests: Uint8Array[] = [];
    const urls: string[] = [];
    let failed = false;
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      if (!(init.body instanceof Uint8Array)) {
        throw new Error("Expected a binary seed update");
      }
      urls.push(url);
      requests.push(init.body);
      const payload: unknown = decodeAny(init.body);
      if (
        typeof payload !== "object" ||
        payload === null ||
        !("update" in payload) ||
        !(payload.update instanceof Uint8Array)
      ) {
        throw new Error("Expected an encoded Yjs update");
      }
      const fail = !failed && requests.length === 2;
      if (!fail || lostResponse) {
        Y.applyUpdate(remote, payload.update);
      }
      if (fail) {
        failed = true;
        return new Response(null, { status: 503 });
      }
      return new Response(null, { status: 200 });
    });
    const options = { baseUrl: "https://example.test/api", org: "retry-test" };
    await expect(seedSampleDocument(options)).rejects.toThrow("503");
    // Index removal does not remove the durable seed updates or change their IDs.
    localStorage.removeItem("bn-multi-doc-index");
    const id = await seedSampleDocument(options);
    expect(new Set(urls)).toEqual(
      new Set([`${options.baseUrl}/ydoc/v1/${options.org}/${id}`]),
    );
    expect(requests[2]).toEqual(requests[0]);
    expect(requests[3]).toEqual(requests[1]);
    expect(remote.get("__bn_versions").toArray()).toHaveLength(3);
    const contents = remote.get().toJSON();
    const state = Y.encodeStateVector(remote);
    await seedSampleDocument(options);
    expect(remote.get().toJSON()).toEqual(contents);
    expect(Y.encodeStateVector(remote)).toEqual(state);
    expect(remote.get("__bn_versions").toArray()).toHaveLength(3);
    remote.destroy();
  },
);
