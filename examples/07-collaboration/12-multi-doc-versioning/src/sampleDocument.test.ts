import { afterEach, beforeEach, expect, it, vi } from "vite-plus/test";
import * as Y from "@y/y";
import { decodeAny, encodeAny } from "lib0/buffer";
import { seedSampleDocument } from "./sampleDocument.js";

beforeEach(() => localStorage.clear());
afterEach(() => {
  localStorage.clear();
  vi.unstubAllGlobals();
});

it.each([
  { lostResponse: false, failAt: "patch" },
  { lostResponse: true, failAt: "patch" },
  { lostResponse: false, failAt: "checkpoint" },
  { lostResponse: true, failAt: "checkpoint" },
])(
  "replays partial seeding without duplicate content or native checkpoints ($failAt, lost response: $lostResponse)",
  async ({ lostResponse, failAt }) => {
    const remote = new Y.Doc({ gc: false });
    const requests: Uint8Array[] = [];
    const urls: string[] = [];
    const checkpoints = new Map<number, string>();
    let checkpointPosts = 0;
    let failed = false;
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      if (url.includes("/version/v1/")) {
        if (!init) {
          const at = Number(new URL(url).searchParams.get("from"));
          return new Response(
            encodeAny({
              versions: checkpoints.has(at)
                ? [{ t: at, name: checkpoints.get(at) }]
                : [],
            }) as BodyInit,
          );
        }
        expect(init.method).toBe("POST");
        if (!(init.body instanceof Uint8Array)) {
          throw new Error("Expected a binary checkpoint request");
        }
        const checkpoint: unknown = decodeAny(init.body);
        if (
          typeof checkpoint !== "object" ||
          checkpoint === null ||
          !("t" in checkpoint) ||
          typeof checkpoint.t !== "number" ||
          !("name" in checkpoint) ||
          typeof checkpoint.name !== "string"
        ) {
          throw new Error("Expected native checkpoint metadata");
        }
        expect(checkpoints.has(checkpoint.t)).toBe(false);
        checkpointPosts++;
        const fail =
          failAt === "checkpoint" && !failed && checkpointPosts === 2;
        if (!fail || lostResponse) {
          checkpoints.set(checkpoint.t, checkpoint.name);
        }
        if (fail) {
          failed = true;
          return new Response(null, { status: 503 });
        }
        return new Response(null, { status: 200 });
      }
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
      const fail = failAt === "patch" && !failed && requests.length === 2;
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
    expect([...checkpoints.values()]).toEqual([
      "First draft",
      "Added dates",
      "Marketing review",
    ]);
    expect(remote.get("__bn_versions").toArray()).toHaveLength(0);
    const contents = remote.get().toJSON();
    const state = Y.encodeStateVector(remote);
    await seedSampleDocument(options);
    expect(remote.get().toJSON()).toEqual(contents);
    expect(Y.encodeStateVector(remote)).toEqual(state);
    expect(checkpoints.size).toBe(3);
    remote.destroy();
  },
);
