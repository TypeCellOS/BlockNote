// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from "vite-plus/test";
import { decodeAny, encodeAny } from "lib0/buffer";
import * as Y from "@y/y";
import { BlockNoteEditor } from "../../../editor/BlockNoteEditor.js";
import {
  createYHubVersionStorage,
  type YHubVersionStorageOptions,
} from "../yhub.js";
import { YHubClient } from "../yhubClient.js";

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
  const editor = BlockNoteEditor.create();
  cleanup.push(() => {
    editor._tiptapEditor.destroy();
    doc.destroy();
  });
  return {
    api: createYHubVersionStorage({ ...options, activityParams }).bind({
      editor,
      fragment,
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
  expect(await storage().api.list(signal)).toMatchObject([
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
  expect(request(0).signal).toBe(signal);
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
    const rows = await storage({ groupByUser: true }).api.list(signal);
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
  expect(await storage(activityParams).api.list(signal)).toMatchObject([
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

it("names the latest server checkpoint rather than uploading frozen client bytes", async () => {
  fetchSpy
    .mockResolvedValueOnce(response({ activity: [latest] }))
    .mockResolvedValueOnce(response({ versions: [] }))
    .mockResolvedValueOnce(
      response({ ...version, t: latest.to, name: "Current milestone" }),
    );
  expect(
    await storage().api.create?.(new Uint8Array([1, 2]), "Current milestone"),
  ).toMatchObject({ id: "2000", createdAt: 2000, name: "Current milestone" });
  expect(request(0).url.searchParams.get("limit")).toBe("1");
  expect(request(2).method).toBe("POST");
  expect(request(2).body).toEqual({
    type: "version:v1",
    t: 2000,
    name: "Current milestone",
  });
});

it("renames an already named latest checkpoint while preserving metadata", async () => {
  const current = { ...version, t: latest.to };
  fetchSpy
    .mockResolvedValueOnce(response({ activity: [latest] }))
    .mockResolvedValueOnce(response({ versions: [current] }))
    .mockResolvedValueOnce(response({ ...current, name: "Renamed current" }));
  expect(
    await storage().api.create?.(new Uint8Array(), "Renamed current"),
  ).toMatchObject({
    id: "2000",
    name: "Renamed current",
    metadata: version.custom,
  });
  expect(request(2).method).toBe("PATCH");
  expect(request(2).body.custom).toEqual(version.custom);
});

it("does not name a checkpoint when no edits have been recorded", async () => {
  fetchSpy.mockResolvedValueOnce(response({ activity: [] }));
  expect(
    await storage().api.create?.(new Uint8Array(), "Current milestone"),
  ).toBeUndefined();
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
  await expect(storage().api.rename!("1000", "New")).rejects.toThrow("409");
});

it("fetches historical content by timestamp and converts it to V2", async () => {
  const { api, doc } = storage();
  doc.get("default").push(["hello"]);
  fetchSpy.mockResolvedValueOnce(
    response({ ydoc: Y.encodeStateAsUpdate(doc) }),
  );
  const content = await api.getContent("1000", signal);
  const restored = new Y.Doc();
  try {
    Y.applyUpdateV2(restored, content);
    expect(restored.get("default").toArray()).toEqual(["hello"]);
  } finally {
    restored.destroy();
  }
  expect(request(0).url.searchParams.get("to")).toBe("1000");
  expect(request(0).signal).toBe(signal);
});

it.each(["current", "snapshot"] as const)(
  "uses the %s attribution cutoff",
  async (type) => {
    fetchSpy.mockResolvedValueOnce(
      response({ attributions: Y.encodeContentMap(Y.createContentMap()) }),
    );
    await storage().api.getAttributions!(
      type === "current" ? { type } : { type, id: "2000" },
      "1000",
      2500,
      signal,
    );
    expect(request(0).url.searchParams.get("from")).toBe("1000");
    expect(request(0).url.searchParams.get("to")).toBe(
      type === "current" ? "2500" : "2000",
    );
    expect(request(0).signal).toBe(signal);
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
    expect(calls.at(-1)?.body.from).toBe(1001);
    expect(
      Y.decodeContentIds(calls.at(-1)?.body.contentIds).inserts,
    ).toBeDefined();
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
