// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from "vite-plus/test";
import { decodeAny, encodeAny } from "lib0/buffer";
import * as Y from "@y/y";
import {
  createYHubVersionStorage,
  type YHubVersionStorageOptions,
} from "../yhub.js";
import { YHubClient } from "../yhubClient.js";
import { resultValue } from "../../../extensions/Versioning/__test__/result.js";

const options = { baseUrl: "https://yhub.test/api", org: "org", docId: "doc" };
const signal = new AbortController().signal;
const first = { from: 1000, to: 1000, by: ["alice"] };
const latest = { from: 2000, to: 2000, by: ["bob"] };
const version = {
  type: "version:v1" as const,
  t: 1000,
  name: "Milestone",
  custom: { restoredFrom: 42, ticket: "BN-1" },
  updatedAt: 3000,
};
const cleanup: Array<() => void> = [];
let fetchSpy = vi.spyOn(globalThis, "fetch");
beforeEach(() => {
  fetchSpy = vi.spyOn(globalThis, "fetch");
});
afterEach(() => {
  for (const dispose of cleanup.splice(0)) {
    dispose();
  }
  vi.restoreAllMocks();
});

function response(body: unknown, status = 200) {
  return new Response(status === 204 ? null : new Uint8Array(encodeAny(body)), {
    status,
  });
}

function storage(activityParams?: YHubVersionStorageOptions["activityParams"]) {
  const doc = new Y.Doc();
  const fragment = doc.get("default");
  cleanup.push(() => doc.destroy());
  return {
    api: createYHubVersionStorage({
      ...options,
      activityParams,
      fragment,
      beforeRestoreName: "Before restore",
    }),
    doc,
    fragment,
  };
}

function request(index: number) {
  const [url, init] = fetchSpy.mock.calls[index];
  return {
    url: new URL(url instanceof Request ? url.url : url),
    method: init?.method ?? "GET",
    body: init?.body instanceof Uint8Array ? decodeAny(init.body) : undefined,
    signal: init?.signal,
  };
}

it("lists server checkpoints with their attached versions and empty versions", async () => {
  fetchSpy.mockResolvedValueOnce(
    response({
      activity: [
        latest,
        {
          ...first,
          by: ["alice", "bob"],
          version,
          customAttributions: [{ k: "source", v: "import" }],
        },
        {
          from: 500,
          to: 500,
          by: [],
          version: { ...version, t: 500, name: "Empty" },
          isEmpty: true,
        },
      ],
    }),
  );
  expect(resultValue(await storage().api.list(signal))).toMatchObject([
    { id: "2000", by: ["bob"] },
    {
      id: "1000",
      by: ["alice", "bob"],
      name: "Milestone",
      metadata: version.custom,
      restoredFrom: { id: "42", createdAt: 42 },
      customAttributions: { source: "import" },
    },
    { id: "500", by: [], name: "Empty" },
  ]);
  expect(fetchSpy).toHaveBeenCalledOnce();
  expect(request(0).url.searchParams.get("versions")).toBe("true");
  expect(request(0).signal).toBeInstanceOf(AbortSignal);
});

it.each([false, 0, "", ["app"], {}, null].map((custom) => ({ custom })))(
  "preserves each activity entry and its custom metadata $custom",
  async ({ custom }) => {
    fetchSpy.mockResolvedValueOnce(
      response({
        activity: [
          { ...first, by: "bob", version: { ...version, custom } },
          {
            ...first,
            by: "alice",
            customAttributions: [{ k: "source", v: "edit" }],
          },
        ],
      }),
    );
    const rows = resultValue(
      await storage({ groupByUser: true }).api.list(signal),
    );
    expect(rows).toHaveLength(2);
    expect(rows[0].by).toEqual(["bob"]);
    expect(rows[0].metadata).toEqual(custom);
    expect(rows[1].by).toEqual(["alice"]);
    expect(rows[1].metadata).toBeUndefined();
    expect(rows[1].customAttributions).toEqual({ source: "edit" });
    expect(request(0).url.searchParams.get("groupByUser")).toBe("true");
  },
);

it("preserves caller activity filters without merging returned entries", async () => {
  fetchSpy.mockResolvedValueOnce(
    response({
      activity: [
        { ...first, customAttributions: [{ k: "source", v: "import" }] },
        {
          ...first,
          by: ["bob"],
          version,
          customAttributions: [{ k: "tag", v: "release" }],
        },
      ],
    }),
  );
  const activityParams = {
    groupExclude: "alice,bob",
    order: "asc",
    limit: 10,
    from: 500,
    by: "alice,bob",
    customAttributions: true,
  };
  expect(
    resultValue(await storage(activityParams).api.list(signal)),
  ).toMatchObject([
    {
      id: "1000",
      by: ["alice"],
      customAttributions: { source: "import" },
    },
    {
      id: "1000",
      by: ["bob"],
      name: "Milestone",
      metadata: version.custom,
      restoredFrom: { id: "42", createdAt: 42 },
      customAttributions: { tag: "release" },
    },
  ]);
  for (const [key, value] of Object.entries(activityParams)) {
    expect(request(0).url.searchParams.get(key)).toBe(String(value));
  }
  expect(activityParams).toEqual({
    groupExclude: "alice,bob",
    order: "asc",
    limit: 10,
    from: 500,
    by: "alice,bob",
    customAttributions: true,
  });
});

it("names the latest checkpoint only when its content matches frozen current", async () => {
  const { api, doc } = storage();
  doc.get("default").push(["shown"]);
  fetchSpy
    .mockResolvedValueOnce(response({ activity: [latest] }))
    .mockResolvedValueOnce(response({ ydoc: Y.encodeStateAsUpdate(doc) }))
    .mockResolvedValueOnce(response({ versions: [] }))
    .mockResolvedValueOnce(
      response({ ...version, t: latest.to, name: "Current milestone" }),
    );
  expect(
    await api.create!(Y.encodeStateAsUpdateV2(doc), "Current milestone"),
  ).toMatchObject({
    ok: true,
    value: { id: "2000", createdAt: 2000, name: "Current milestone" },
  });
  expect(request(0).url.searchParams.get("limit")).toBe("1");
  expect(request(3).method).toBe("POST");
  expect(request(3).body).toEqual({
    type: "version:v1",
    t: 2000,
    name: "Current milestone",
  });
});

it("renames an already named latest checkpoint while preserving metadata", async () => {
  const { api, doc } = storage();
  doc.get("default").push(["shown"]);
  const current = { ...version, t: latest.to };
  fetchSpy
    .mockResolvedValueOnce(response({ activity: [latest] }))
    .mockResolvedValueOnce(response({ ydoc: Y.encodeStateAsUpdate(doc) }))
    .mockResolvedValueOnce(response({ versions: [current] }))
    .mockResolvedValueOnce(response({ ...current, name: "Renamed current" }));
  expect(
    await api.create!(Y.encodeStateAsUpdateV2(doc), "Renamed current"),
  ).toMatchObject({
    ok: true,
    value: {
      id: "2000",
      name: "Renamed current",
      metadata: version.custom,
    },
  });
  expect(request(3).method).toBe("PATCH");
  expect(request(3).body.custom).toEqual(version.custom);
});

it("does not name a checkpoint when no edits have been recorded", async () => {
  fetchSpy.mockResolvedValueOnce(response({ activity: [] }));
  expect(
    await storage().api.create?.(new Uint8Array(), "Current milestone"),
  ).toEqual({ ok: false, error: { type: "conflict" } });
  expect(fetchSpy).toHaveBeenCalledOnce();
});

it("names a recorded checkpoint through POST", async () => {
  fetchSpy.mockResolvedValueOnce(response({ versions: [] }));
  fetchSpy.mockResolvedValueOnce(response({ ...version, name: "Saved" }));
  await storage().api.rename!("1000", "Saved");
  expect(request(1)).toMatchObject({
    method: "POST",
    body: { type: "version:v1", t: 1000, name: "Saved" },
  });
});

it("renames through conditional PATCH without losing custom data", async () => {
  fetchSpy.mockResolvedValueOnce(response({ versions: [version] }));
  fetchSpy.mockResolvedValueOnce(response({ ...version, name: "New" }));
  await storage().api.rename!("1000", "New");
  expect(request(1)).toMatchObject({
    method: "PATCH",
    body: {
      updatedAt: 3000,
      name: "New",
      custom: version.custom,
    },
  });
});

it("removes a name without removing app metadata", async () => {
  fetchSpy.mockResolvedValueOnce(response({ versions: [version] }));
  fetchSpy.mockResolvedValueOnce(response({ ...version, name: "" }));
  await storage().api.remove!("1000");
  expect(request(1).body).toMatchObject({ name: "", custom: version.custom });
});

it("conditionally deletes a version without custom metadata", async () => {
  fetchSpy.mockResolvedValueOnce(
    response({ versions: [{ ...version, custom: null }] }),
  );
  fetchSpy.mockResolvedValueOnce(response(null, 204));
  await storage().api.remove!("1000");
  expect(request(1).method).toBe("DELETE");
  expect(request(1).url.searchParams.get("updatedAt")).toBe("3000");
});

it("leaves unnamed automatic activity alone", async () => {
  fetchSpy.mockResolvedValueOnce(response({ versions: [] }));
  await storage().api.remove!("1000");
  expect(fetchSpy).toHaveBeenCalledOnce();
});

it("propagates concurrent version conflicts", async () => {
  fetchSpy.mockResolvedValueOnce(response({ versions: [version] }));
  fetchSpy.mockResolvedValueOnce(response({ error: "conflict" }, 409));
  expect(await storage().api.rename!("1000", "New")).toEqual({
    ok: false,
    error: { type: "conflict" },
  });
});

it("fetches historical content by timestamp and converts it to V2", async () => {
  const { api, doc } = storage();
  doc.get("default").push(["hello"]);
  fetchSpy.mockResolvedValueOnce(
    response({ ydoc: Y.encodeStateAsUpdate(doc) }),
  );
  const content = resultValue(await api.getContent("1000", signal));
  const restored = new Y.Doc();
  try {
    Y.applyUpdateV2(restored, content);
    expect(restored.get("default").toArray()).toEqual(["hello"]);
  } finally {
    restored.destroy();
  }
  expect(request(0).url.searchParams.get("to")).toBe("1000");
  expect(request(0).signal).toBeInstanceOf(AbortSignal);
});

it.each([
  { type: "current", capturedAt: 500 },
  { type: "current", capturedAt: 2500 },
  { type: "snapshot", capturedAt: 2500 },
] as const)(
  "uses the server attribution cutoff for $type with client capture time $capturedAt",
  async ({ type, capturedAt }) => {
    fetchSpy.mockResolvedValueOnce(
      response({ attributions: Y.encodeContentMap(Y.createContentMap()) }),
    );
    await storage().api.getAttributions!(
      type === "current" ? { type } : { type, id: "2000" },
      "1000",
      capturedAt,
      signal,
    );
    expect(request(0).url.searchParams.get("from")).toBe("1000");
    expect(request(0).url.searchParams.get("to")).toBe(
      type === "current" ? null : "2000",
    );
    expect(request(0).signal).toBeInstanceOf(AbortSignal);
  },
);

it.each([false, true])(
  "preserves the live head before restore, existing named checkpoint: %s",
  async (named) => {
    const { api, doc, fragment } = storage();
    fragment.push(["hello"]);
    fetchSpy.mockImplementation(async (input, init) => {
      const path = new URL(input instanceof Request ? input.url : input)
        .pathname;
      if (path.includes("/activity/")) {
        return response({ activity: [latest] });
      }
      if (path.includes("/ydoc/")) {
        return response({ doc: Y.encodeStateAsUpdate(doc) });
      }
      if (path.includes("/version/") && init?.method !== "POST") {
        return response({ versions: named ? [{ ...version, t: 2000 }] : [] });
      }
      if (path.includes("/version/")) {
        return response({ ...version, t: 2000 });
      }
      return response({ success: true });
    });
    await api.restore!("1000");
    const calls = fetchSpy.mock.calls.map((_, index) => request(index));
    const pins = calls.filter(
      (call) =>
        call.method === "POST" && call.url.pathname.includes("/version/"),
    );
    expect(pins).toHaveLength(named ? 0 : 1);
    if (!named) {
      expect(pins[0].body).toMatchObject({ t: 2000, name: "Before restore" });
    }
    const rollback = calls.find((call) =>
      call.url.pathname.includes("/rollback/"),
    );
    expect(rollback?.body.from).toBe(1001);
    expect(Y.decodeContentIds(rollback?.body.contentIds).inserts).toBeDefined();
  },
);

it.each([false, 0, "", [], {}, null].map((custom) => ({ custom })))(
  "the transport can still save app metadata $custom directly",
  async ({ custom }) => {
    fetchSpy.mockResolvedValueOnce(response({ ...version, custom }));
    await new YHubClient(options).createVersion(1000, "Milestone", custom);
    expect(request(0).body.custom).toEqual(custom);
  },
);

it("refuses to name newer server content that was not shown in frozen current", async () => {
  const { api, doc, fragment } = storage();
  fragment.push(["shown"]);
  const frozen = Y.encodeStateAsUpdateV2(doc);
  fragment.push(["unseen"]);
  fetchSpy
    .mockResolvedValueOnce(response({ activity: [latest] }))
    .mockResolvedValueOnce(response({ ydoc: Y.encodeStateAsUpdate(doc) }));
  expect(await api.create!(frozen, "Milestone")).toEqual({
    ok: false,
    error: { type: "conflict" },
  });
  expect(fetchSpy).toHaveBeenCalledTimes(2);
  expect(fetchSpy.mock.calls.every(([, init]) => !init?.method)).toBe(true);
});

it("waits for the post-rollback document and applies it to the original live document", async () => {
  const { api, doc, fragment } = storage();
  fragment.push(["before"]);
  const server = new Y.Doc();
  Y.applyUpdate(server, Y.encodeStateAsUpdate(doc));
  server.get("default").delete(0, 1);
  server.get("default").push(["restored"]);
  let finish!: (response: Response) => void;
  const postRollback = new Promise<Response>((resolve) => {
    finish = resolve;
  });
  fetchSpy
    .mockResolvedValueOnce(response({ activity: [latest] }))
    .mockResolvedValueOnce(response({ doc: Y.encodeStateAsUpdate(doc) }))
    .mockResolvedValueOnce(response({ versions: [{ ...version, t: 2000 }] }))
    .mockResolvedValueOnce(response({ success: true }))
    .mockReturnValueOnce(postRollback);
  let completed = false;
  const restore = api.restore!("1000").then((result) => {
    completed = true;
    return result;
  });
  await vi.waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(5));
  expect(completed).toBe(false);
  expect(fragment.toArray()).toEqual(["before"]);
  finish(response({ doc: Y.encodeStateAsUpdate(server) }));
  expect(await restore).toEqual({ ok: true, value: undefined });
  expect(fragment.toArray()).toEqual(["restored"]);
  server.destroy();
});

it.each([
  { status: 403, error: { type: "forbidden" } },
  { status: 404, error: { type: "not-found" } },
  { status: 409, error: { type: "conflict" } },
  { status: 500, error: { type: "server", status: 500 } },
])(
  "returns a typed expected error for HTTP $status without exposing its body",
  async ({ status, error }) => {
    fetchSpy.mockResolvedValueOnce(
      response({ error: "private server details" }, status),
    );
    expect(await new YHubClient(options).getActivity()).toEqual({
      ok: false,
      error,
    });
  },
);

it("classifies transport failures but lets unexpected bugs throw", async () => {
  const client = new YHubClient(options);
  fetchSpy.mockRejectedValueOnce(new TypeError("fetch failed"));
  expect(await client.getActivity()).toEqual({
    ok: false,
    error: { type: "network" },
  });
  const bug = new Error("programmer error");
  fetchSpy.mockRejectedValueOnce(bug);
  await expect(client.getActivity()).rejects.toBe(bug);
  fetchSpy.mockResolvedValueOnce(response(null));
  await expect(client.getActivity()).rejects.toThrow();
});

it.each(["read", "mutation"] as const)(
  "bounds a hung $type request and reports whether its outcome is known",
  async (type) => {
    fetchSpy.mockImplementationOnce(
      (_input, init) =>
        new Promise((_, reject) => {
          init?.signal?.addEventListener(
            "abort",
            () => reject(init.signal?.reason),
            { once: true },
          );
        }),
    );
    const client = new YHubClient({ ...options, timeoutMs: 10 });
    const result = await (type === "read"
      ? client.getActivity()
      : client.createVersion(1000, "Named"));
    expect(result).toEqual({
      ok: false,
      error: {
        type: "timeout",
        outcome: type === "read" ? "unchanged" : "unknown",
      },
    });
    expect(fetchSpy).toHaveBeenCalledOnce();
  },
);

it("preserves caller cancellation rather than showing it as a network failure", async () => {
  const abort = new AbortController();
  fetchSpy.mockImplementationOnce(
    (_input, init) =>
      new Promise((_, reject) => {
        init?.signal?.addEventListener(
          "abort",
          () => reject(init.signal?.reason),
          { once: true },
        );
      }),
  );
  const pending = new YHubClient(options).getActivity(undefined, abort.signal);
  abort.abort();
  await expect(pending).rejects.toBe(abort.signal.reason);
});
