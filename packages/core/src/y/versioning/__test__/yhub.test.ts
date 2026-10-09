// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from "vite-plus/test";
import { decodeAny, encodeAny } from "lib0/buffer";
import * as Y from "@y/y";
import {
  configureYProsemirror,
  docToDelta,
  ySyncPluginKey,
} from "@y/prosemirror";
import {
  createYHubVersionStorage,
  YVersioningExtension,
  type YHubVersionStorageOptions,
} from "../yhub.js";
import { YHubClient } from "../yhubClient.js";
import { createVersioning } from "../../../extensions/Versioning/createVersioning.js";
import { resultValue } from "../../../extensions/Versioning/__test__/result.js";
import { BlockNoteEditor } from "../../../editor/BlockNoteEditor.js";
import type { VersioningController } from "../../../extensions/Versioning/Versioning.js";
import { withCollaboration } from "../../extensions/index.js";
import {
  _blocksToProsemirrorNode,
  docDiffToDelta,
  yNodeToTransaction,
} from "../../utils.js";

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

/**
 * Types `a`, `b`, `c` as separate edits at 1000, 1100 and 1200 (by the given
 * authors), serves them through a mocked YHub with the given activity, and
 * returns each character of the shown comparison with the authors that the
 * diff credits it to (none = not changed).
 */
async function compareCharacters({
  authors,
  activity,
  target,
  compareTo,
  showCurrentVersion = false,
}: {
  authors: [string, string, string];
  activity: { first: unknown; history: unknown[] };
  target: { type: "current" } | { type: "snapshot"; id: string };
  compareTo: (history: { id: string }[]) => string;
  showCurrentVersion?: boolean;
}) {
  const { api, doc, fragment } = storage();
  const editor = BlockNoteEditor.create(
    withCollaboration({
      extensions: [
        YVersioningExtension({ storage: { ...api, showCurrentVersion } }),
      ],
      collaboration: { fragment, user: { name: "Alice", color: "red" } },
    }),
  );
  const mode = editor.getExtension<VersioningController>("versioning")!;
  cleanup.unshift(() => {
    mode.dispose();
    editor._tiptapEditor.destroy();
  });

  const edits: {
    at: number;
    content: Uint8Array;
    attributions: Y.ContentMap;
  }[] = [];
  doc.on("beforeObserverCalls", (transaction) => {
    const at = 1000 + edits.length * 100;
    edits.push({
      at,
      content: Y.encodeStateAsUpdate(doc),
      attributions: Y.createContentMapFromContentIds(
        { inserts: transaction.insertSet, deletes: transaction.deleteSet },
        [
          Y.createContentAttribute("insert", authors[edits.length]),
          Y.createContentAttribute("insertAt", at),
        ],
        [],
      ),
    });
  });
  function paragraph(text: string) {
    return _blocksToProsemirrorNode(editor, [
      { id: "paragraph", type: "paragraph", content: text },
    ]);
  }
  const empty = Y.encodeStateAsUpdate(doc);
  for (const text of ["a", "ab", "abc"]) {
    fragment.applyDelta(
      text === "a"
        ? docToDelta(paragraph(text))
        : docDiffToDelta(paragraph(text.slice(0, -1)), paragraph(text)),
    );
  }

  fetchSpy.mockImplementation(async (input) => {
    const url = new URL(input instanceof Request ? input.url : input);
    if (url.pathname.includes("/activity/")) {
      return response({
        activity:
          url.searchParams.get("order") === "asc"
            ? [activity.first]
            : activity.history,
      });
    }
    const from = Number(url.searchParams.get("from") ?? 0);
    const to = Number(url.searchParams.get("to") ?? Infinity);
    if (url.searchParams.has("attributions")) {
      const attributions = Y.createContentMap();
      for (const edit of edits.filter(
        (edit) => from <= edit.at && edit.at <= to,
      )) {
        Y.insertIntoIdMap(attributions.inserts, edit.attributions.inserts);
      }
      return response({ attributions: Y.encodeContentMap(attributions) });
    }
    // YHub includes edits at `to`, not just edits before it.
    return response({
      ydoc: edits.findLast((edit) => edit.at <= to)?.content ?? empty,
    });
  });

  editor.replaceBlocks(editor.document, [
    { id: "paragraph", type: "paragraph", content: "abc" },
  ]);
  editor.prosemirrorView.updateState(
    editor.prosemirrorState.reconfigure({
      plugins: editor._tiptapEditor.extensionManager.plugins,
    }),
  );
  editor.exec(configureYProsemirror({ ytype: fragment }));
  mode.open();
  expect(await mode.list()).toEqual({ status: "done" });
  const state = mode.store.state;
  if (state.mode !== "versions" || state.history.status !== "success") {
    throw new Error("Expected loaded version history");
  }
  expect(
    await mode.select(target, { compareTo: compareTo(state.history.data) }),
  ).toEqual({ status: "done" });

  // Headless editors have no plugin view to hydrate the configured preview.
  const binding = ySyncPluginKey.getState(editor.prosemirrorState)!;
  editor.prosemirrorView.dispatch(
    yNodeToTransaction(editor.prosemirrorState.tr, binding.ytype!, {
      renderer: binding.renderer,
    }),
  );
  const characters: { character: string; authors: string[] }[] = [];
  editor.prosemirrorState.doc.descendants((node) => {
    if (node.isText) {
      const insertion = node.marks.find(
        (mark) => mark.type.name === "y-attributed-insert",
      );
      for (const character of node.text!) {
        characters.push({
          character,
          authors: insertion?.attrs.userIds ?? [],
        });
      }
    }
  });
  return characters;
}

it.each([false, true])(
  "attributes every character of abc when comparing since beginning (Current: %s)",
  async (showCurrentVersion) => {
    const characters = await compareCharacters({
      authors: ["alice", "alice", "alice"],
      activity: { first, history: [{ ...first, to: 1200 }] },
      target: showCurrentVersion
        ? { type: "current" }
        : { type: "snapshot", id: "1000-1200" },
      compareTo: (history) => history.at(-1)!.id,
      showCurrentVersion,
    });
    expect(characters).toEqual(
      ["a", "b", "c"].map((character) => ({ character, authors: ["alice"] })),
    );
  },
);

it("shows only the selected version's edits when comparing to the previous version", async () => {
  // Beginning (a), then "1000-1100" by alice (a, b), then "1200-1200" by bob (c).
  const characters = await compareCharacters({
    authors: ["alice", "alice", "bob"],
    activity: {
      first,
      history: [
        { from: 1200, to: 1200, by: ["bob"] },
        { from: 1000, to: 1100, by: ["alice"] },
      ],
    },
    target: { type: "snapshot", id: "1200-1200" },
    compareTo: () => "1000-1100",
  });
  expect(characters).toEqual([
    { character: "a", authors: [] },
    { character: "b", authors: [] },
    { character: "c", authors: ["bob"] },
  ]);
});

it("uses the latest server checkpoint as Current without a separate capture row", () => {
  expect(storage().api.showCurrentVersion).toBe(false);
  expect(fetchSpy).not.toHaveBeenCalled();
});

it("lists the first edit as an ordinary snapshot independently of sidebar filters and grouping", async () => {
  const { api, doc } = storage({ from: 1500, by: "bob", group: true });
  doc.get("default").push(["initial content"]);
  fetchSpy
    .mockResolvedValueOnce(response({ activity: [latest] }))
    .mockResolvedValueOnce(response({ activity: [{ ...first, version }] }))
    .mockResolvedValueOnce(response({ ydoc: Y.encodeStateAsUpdate(doc) }));
  const { snapshots: versions } = resultValue(await api.list(signal));
  expect(versions).toHaveLength(2);
  const start = versions[1];
  expect(start).toMatchObject({
    id: "1000-1000",
    createdAt: 1000,
    by: ["alice"],
    name: "Milestone",
    metadata: version.custom,
    restoredFrom: { id: "42-42", createdAt: 42 },
  });
  const content = resultValue(await api.getContent(start.id, signal));
  const decoded = new Y.Doc();
  try {
    Y.applyUpdateV2(decoded, content);
    expect(decoded.get("default").toArray()).toEqual(["initial content"]);
    expect(Object.fromEntries(request(1).url.searchParams)).toEqual({
      from: "0",
      order: "asc",
      limit: "1",
      group: "false",
      versions: "true",
      customAttributions: "true",
    });
    expect(request(2).url.searchParams.get("to")).toBe("1000");
  } finally {
    decoded.destroy();
  }
});

it("lists no snapshots when there are no recorded edits", async () => {
  fetchSpy.mockImplementation(async () => response({ activity: [] }));
  expect(await storage().api.list(signal)).toEqual({
    ok: true,
    value: { snapshots: [], nextCursor: undefined },
  });
  expect(fetchSpy).toHaveBeenCalledTimes(2);
});

it("reloads an unnamed YHub checkpoint as Current on each opening without creating a version", async () => {
  const { api, doc } = storage();
  const show = vi.fn();
  const mode = createVersioning({
    storage: api,
    adapter: {
      supportsComparison: false,
      open() {
        return {
          current: { content: new Uint8Array(), capturedAt: 3000 },
          show,
          close() {},
        };
      },
    },
    setReadOnly() {},
  });
  for (let opening = 0; opening < 2; opening++) {
    fetchSpy
      .mockResolvedValueOnce(response({ activity: [latest, first] }))
      .mockResolvedValueOnce(response({ activity: [first] }))
      .mockResolvedValueOnce(response({ ydoc: Y.encodeStateAsUpdate(doc) }));
    mode.open();
    expect(await mode.list()).toEqual({ status: "done" });
    expect(mode.store.state).toMatchObject({
      showCurrentVersion: false,
      displayed: { type: "snapshot", id: "2000-2000" },
      history: {
        data: [{ id: "2000-2000", name: undefined }, { id: "1000-1000" }],
      },
    });
    expect(show.mock.lastCall?.[0].target).toEqual({
      type: "snapshot",
      id: "2000-2000",
    });
    mode.close();
  }
  expect(fetchSpy).toHaveBeenCalledTimes(6);
  for (let index = 0; index < 6; index++) {
    expect(request(index).method).toBe("GET");
  }
});

it("lists server checkpoints with their attached versions and empty versions", async () => {
  fetchSpy
    .mockResolvedValueOnce(
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
    )
    .mockResolvedValueOnce(response({ activity: [] }));
  expect(resultValue(await storage().api.list(signal)).snapshots).toMatchObject(
    [
      { id: "2000-2000", by: ["bob"] },
      {
        id: "1000-1000",
        by: ["alice", "bob"],
        name: "Milestone",
        metadata: version.custom,
        restoredFrom: { id: "42-42", createdAt: 42 },
        customAttributions: { source: "import" },
      },
      { id: "500-500", by: [], name: "Empty" },
    ],
  );
  expect(fetchSpy).toHaveBeenCalledTimes(2);
  expect(request(0).url.searchParams.get("versions")).toBe("true");
  expect(request(0).signal).toBeInstanceOf(AbortSignal);
});

it.each([false, 0, "", ["app"], {}, null].map((custom) => ({ custom })))(
  "preserves each activity entry and its custom metadata $custom",
  async ({ custom }) => {
    fetchSpy
      .mockResolvedValueOnce(
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
      )
      .mockResolvedValueOnce(response({ activity: [first] }));
    const { snapshots: rows } = resultValue(
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
  fetchSpy
    .mockResolvedValueOnce(
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
    )
    .mockResolvedValueOnce(response({ activity: [first] }));
  const activityParams = {
    groupExclude: "alice,bob",
    order: "desc",
    limit: 10,
    from: 500,
    by: "alice,bob",
    customAttributions: true,
  };
  expect(
    resultValue(await storage(activityParams).api.list(signal)).snapshots,
  ).toMatchObject([
    {
      id: "1000-1000",
      by: ["alice"],
      customAttributions: { source: "import" },
    },
    {
      id: "1000-1000",
      by: ["bob"],
      name: "Milestone",
      metadata: version.custom,
      restoredFrom: { id: "42-42", createdAt: 42 },
      customAttributions: { tag: "release" },
    },
  ]);
  for (const [key, value] of Object.entries(activityParams)) {
    expect(request(0).url.searchParams.get(key)).toBe(
      String(key === "limit" ? Number(value) + 1 : value),
    );
  }
  expect(activityParams).toEqual({
    groupExclude: "alice,bob",
    order: "desc",
    limit: 10,
    from: 500,
    by: "alice,bob",
    customAttributions: true,
  });
});

it("pages through bounded activity windows with stable timestamp identifiers", async () => {
  const activity = [
    { from: 90, to: 100, by: ["alice"] },
    { from: 70, to: 80, by: ["bob"], version: { ...version, t: 80 } },
    { from: 50, to: 60, by: ["alice"] },
  ];
  fetchSpy.mockImplementation(async (url) => {
    const params = new URL(url instanceof Request ? url.url : url).searchParams;
    if (params.get("order") === "asc") {
      return response({ activity: [activity.at(-1)] });
    }
    const to = Number(params.get("to") ?? Infinity);
    return response({
      activity: activity
        .filter((entry) => entry.to <= to)
        .slice(0, Number(params.get("limit"))),
    });
  });
  const { api } = storage({ limit: 1 });
  const snapshots = [];
  const cursors = new Set<string>();
  let cursor: string | undefined;
  do {
    const page = resultValue(await api.list(signal, cursor));
    snapshots.push(...page.snapshots);
    cursor = page.nextCursor;
    if (cursor !== undefined) {
      expect(cursors.has(cursor)).toBe(false);
      cursors.add(cursor);
    }
  } while (cursor !== undefined);
  expect(
    snapshots.map(({ id, createdAt, name }) => ({ id, createdAt, name })),
  ).toEqual([
    { id: "90-100", createdAt: 100, name: undefined },
    // The first page also pins the beginning; the controller deduplicates it.
    { id: "50-60", createdAt: 60, name: undefined },
    { id: "70-80", createdAt: 80, name: "Milestone" },
    { id: "50-60", createdAt: 60, name: undefined },
  ]);
});

it("keeps grouping fixed while traversing a cursor and uses changed options on refresh", async () => {
  const activityParams = { limit: 1, groupMaxGap: 10, groupByUser: false };
  fetchSpy.mockImplementation(async (url) => {
    const params = new URL(url instanceof Request ? url.url : url).searchParams;
    if (params.get("order") === "asc") {
      return response({ activity: [first] });
    }
    return response({ activity: params.has("to") ? [first] : [latest, first] });
  });
  const { api } = storage(activityParams);
  const page = resultValue(await api.list(signal));
  activityParams.groupMaxGap = 20;
  activityParams.groupByUser = true;
  expect(
    resultValue(await api.list(signal, page.nextCursor)).snapshots[0].id,
  ).toBe("1000-1000");
  await api.list(signal);
  expect(request(2).url.searchParams.get("groupMaxGap")).toBe("10");
  expect(request(2).url.searchParams.get("groupByUser")).toBe("false");
  expect(request(3).url.searchParams.get("groupMaxGap")).toBe("20");
  expect(request(3).url.searchParams.get("groupByUser")).toBe("true");
});

it.each([{ activity: [] }, { activity: [latest] }])(
  "reports exhaustion without an unnecessary empty-page request for %j",
  async ({ activity }) => {
    fetchSpy
      .mockResolvedValueOnce(response({ activity }))
      .mockResolvedValueOnce(response({ activity }));
    const page = resultValue(await storage({ limit: 1 }).api.list(signal));
    expect(page.nextCursor).toBeUndefined();
    expect(page.snapshots.map((snapshot) => snapshot.id)).toEqual(
      activity.map((entry) => `${entry.from}-${entry.to}`),
    );
  },
);

it.each([0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])(
  "rejects invalid activity page size %s",
  async (limit) => {
    await expect(storage({ limit }).api.list(signal)).rejects.toThrow(
      "positive integer",
    );
  },
);

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
    value: { id: "2000-2000", createdAt: 2000, name: "Current milestone" },
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
      id: "2000-2000",
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
  await storage().api.rename!("900-1000", "Saved");
  expect(request(1)).toMatchObject({
    method: "POST",
    body: { type: "version:v1", t: 1000, name: "Saved" },
  });
});

it("renames through conditional PATCH without losing custom data", async () => {
  fetchSpy.mockResolvedValueOnce(response({ versions: [version] }));
  fetchSpy.mockResolvedValueOnce(response({ ...version, name: "New" }));
  await storage().api.rename!("900-1000", "New");
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
  await storage().api.remove!("900-1000");
  expect(request(1).body).toMatchObject({ name: "", custom: version.custom });
});

it("conditionally deletes a version without custom metadata", async () => {
  fetchSpy.mockResolvedValueOnce(
    response({ versions: [{ ...version, custom: null }] }),
  );
  fetchSpy.mockResolvedValueOnce(response(null, 204));
  await storage().api.remove!("900-1000");
  expect(request(1).method).toBe("DELETE");
  expect(request(1).url.searchParams.get("updatedAt")).toBe("3000");
});

it("leaves unnamed automatic activity alone", async () => {
  fetchSpy.mockResolvedValueOnce(response({ versions: [] }));
  await storage().api.remove!("900-1000");
  expect(fetchSpy).toHaveBeenCalledOnce();
});

it("propagates concurrent version conflicts", async () => {
  fetchSpy.mockResolvedValueOnce(response({ versions: [version] }));
  fetchSpy.mockResolvedValueOnce(response({ error: "conflict" }, 409));
  expect(await storage().api.rename!("900-1000", "New")).toEqual({
    ok: false,
    error: { type: "conflict" },
  });
});

it.each([
  { baseline: undefined, beginning: "900-1000", to: "1000" },
  { baseline: true, beginning: "500-500", to: "1000" },
  { baseline: true, beginning: "900-1000", to: "899" },
])(
  "loads V2 content at $to (baseline: $baseline, beginning: $beginning)",
  async ({ baseline, beginning, to }) => {
    const { api, doc } = storage();
    doc.get("default").push(["hello"]);
    const [from, end] = beginning.split("-").map(Number);
    fetchSpy.mockImplementation(async (input) =>
      new URL(input instanceof Request ? input.url : input).pathname.includes(
        "/activity/",
      )
        ? response({ activity: [{ from, to: end, by: ["alice"] }] })
        : response({ ydoc: Y.encodeStateAsUpdate(doc) }),
    );
    // The beginning is known once the history is listed.
    resultValue(await api.list(signal));
    const content = resultValue(
      await api.getContent("900-1000", signal, { baseline }),
    );
    const restored = new Y.Doc();
    try {
      Y.applyUpdateV2(restored, content);
      expect(restored.get("default").toArray()).toEqual(["hello"]);
    } finally {
      restored.destroy();
    }
    const load = fetchSpy.mock.calls.findIndex(
      ([input]) =>
        !new URL(
          input instanceof Request ? input.url : input,
        ).pathname.includes("/activity/"),
    );
    expect(request(load).url.searchParams.get("to")).toBe(to);
    expect(request(load).signal).toBeInstanceOf(AbortSignal);
  },
);

it.each([
  { type: "current", capturedAt: 500, beginning: true },
  { type: "current", capturedAt: 2500, beginning: true },
  { type: "snapshot", capturedAt: 2500, beginning: true },
  { type: "snapshot", capturedAt: 2500, beginning: false },
] as const)(
  "uses the server attribution cutoff for $type with client capture time $capturedAt (beginning: $beginning)",
  async ({ type, capturedAt, beginning }) => {
    fetchSpy.mockImplementation(async (input) =>
      new URL(input instanceof Request ? input.url : input).pathname.includes(
        "/activity/",
      )
        ? response({
            activity: [
              beginning
                ? { from: 900, to: 1000, by: ["alice"] }
                : { from: 500, to: 500, by: ["alice"] },
            ],
          })
        : response({ attributions: Y.encodeContentMap(Y.createContentMap()) }),
    );
    const { api } = storage();
    // The beginning is known once the history is listed.
    resultValue(await api.list(signal));
    await api.getAttributions!(
      type === "current" ? { type } : { type, id: "1900-2000" },
      "900-1000",
      capturedAt,
      signal,
    );
    const query = request(fetchSpy.mock.calls.length - 1);
    // The beginning's own edits count; a later baseline's edits don't.
    expect(query.url.searchParams.get("from")).toBe(beginning ? "900" : "1001");
    expect(query.url.searchParams.get("to")).toBe(
      type === "current" ? null : "2000",
    );
    expect(query.signal).toBeInstanceOf(AbortSignal);
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
    await api.restore!("900-1000");
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

it.each(["alice", "bob"])(
  "authenticates every restore request as %s without using the rollback author filter",
  async (userid) => {
    const doc = new Y.Doc();
    cleanup.push(() => doc.destroy());
    const fragment = doc.get("default");
    fragment.push(["hello"]);
    const api = createYHubVersionStorage({
      ...options,
      queryParams: { userid },
      fragment,
      beforeRestoreName: "Before restore",
    });
    fetchSpy.mockImplementation(async (input, init) => {
      const path = new URL(input instanceof Request ? input.url : input)
        .pathname;
      if (path.includes("/activity/")) {
        return response({ activity: [latest] });
      }
      if (path.includes("/ydoc/")) {
        return response({ doc: Y.encodeStateAsUpdate(doc) });
      }
      if (path.includes("/version/")) {
        return init?.method === "POST"
          ? response({ ...version, t: latest.to })
          : response({ versions: [] });
      }
      return response({ success: true });
    });
    expect(await api.restore("900-1000")).toEqual({
      ok: true,
      value: undefined,
    });
    const calls = fetchSpy.mock.calls.map((_, index) => request(index));
    expect(calls).toHaveLength(6);
    for (const call of calls) {
      expect(call.url.searchParams.get("userid")).toBe(userid);
    }
    const rollback = calls.find((call) =>
      call.url.pathname.includes("/rollback/"),
    );
    expect(Object.keys(rollback?.body).sort()).toEqual(["contentIds", "from"]);
    expect(calls[0].url.searchParams.get("limit")).toBe("1");
    expect(calls[1].url.searchParams.get("gc")).toBe("false");
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
  const restore = api.restore!("900-1000").then((result) => {
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
