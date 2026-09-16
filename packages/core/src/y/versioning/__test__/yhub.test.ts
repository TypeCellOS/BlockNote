import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vite-plus/test";
import { decodeAny, encodeAny } from "lib0/buffer";
import * as Y from "@y/y";

import type { VersionSnapshot } from "../../../extensions/Versioning/index.js";
import { createYHubVersioningEndpoints } from "../yhub.js";
import { BlockNoteEditor } from "../../../editor/BlockNoteEditor.js";
import { createExtension } from "../../../editor/BlockNoteExtension.js";

// ---------------------------------------------------------------------------
// Fixture data — an activity entry's `to` is the version's identity.
// ---------------------------------------------------------------------------

const ENTRY_1 = {
  from: 1782218082853,
  to: 1782218082853,
  by: "user-1",
};

const ENTRY_2 = {
  from: 1782218211312,
  to: 1782218211312,
  by: "user-2, user-3",
};

// Snapshots as produced by `list()` (see `activityToSnapshot`): `id` is the
// stringified `to`, which is also `createdAt`. The entry's comma-separated `by`
// user-ids are split into the version's raw `by` array.
const SNAPSHOT_1: VersionSnapshot = {
  id: String(ENTRY_1.to),
  createdAt: ENTRY_1.to,
  by: ["user-1"],
};

const SNAPSHOT_2: VersionSnapshot = {
  id: String(ENTRY_2.to),
  createdAt: ENTRY_2.to,
  by: ["user-2", "user-3"],
};

function makeChangeset(opts: { ydoc?: boolean; attributions?: boolean } = {}) {
  const doc = new Y.Doc();
  const frag = doc.get("default", "XmlFragment");
  frag.insert(0, ["hello"]);
  return {
    ...(opts.ydoc !== false ? { ydoc: Y.encodeStateAsUpdate(doc) } : {}),
    ...(opts.attributions ? { attributions: new Uint8Array([0]) } : {}),
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const BASE_URL = "https://yhub.test/api";
const ORG = "test-org";
const DOC_ID = "test-doc";

// The factory returns a callback that receives the editor instance (used to
// reach the live collaboration doc that holds the named-version array). These
// endpoints are built on a bare editor with no collaboration extensions, so
// only the read-only paths work on them.
function makeEndpoints() {
  const editor = BlockNoteEditor.create();
  return createYHubVersioningEndpoints({
    baseUrl: BASE_URL,
    org: ORG,
    docId: DOC_ID,
  })(editor);
}

// A lightweight stand-in for the real `ySync` extension. yhub.ts reaches the
// live collaboration doc exclusively via
// `editor.getExtension("ySync")?.fragment.doc`, so a stub that just exposes the
// fragment is enough to exercise the `__bn_versions` store without wiring up
// the full collaboration/prosemirror sync machinery.
const ySyncStub = (fragment: Y.Node) =>
  createExtension({ key: "ySync", fragment } as any);

// Build endpoints against an editor that has a `ySync` extension whose fragment
// belongs to `doc`, so the named-version array on `doc` is reachable.
function makeCollabEndpoints(doc: Y.Doc) {
  const fragment = doc.get("default", "XmlFragment") as unknown as Y.Node;
  (fragment as any).insert(0, ["hello"]);
  const editor = BlockNoteEditor.create({
    extensions: [ySyncStub(fragment)],
  });
  const endpoints = createYHubVersioningEndpoints({
    baseUrl: BASE_URL,
    org: ORG,
    docId: DOC_ID,
  })(editor);
  return { endpoints, fragment };
}

/** The raw contents of the `__bn_versions` array on `doc`. */
function versionEntries(doc: Y.Doc): Array<Record<string, unknown>> {
  return doc.get("__bn_versions").toArray() as Array<Record<string, unknown>>;
}

function mockFetchResponse(body: unknown, status = 200) {
  const encoded = encodeAny(body);
  return new Response(encoded as Blob | BufferSource, {
    status,
    statusText: status === 200 ? "OK" : "Error",
  });
}

function makeFragment(): Y.Node {
  const doc = new Y.Doc();
  const frag = doc.get("default", "XmlFragment");
  frag.insert(0, ["test content"]);
  return frag;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("createYHubVersioningEndpoints", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, "fetch");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // -------------------------------------------------------------------------
  // list
  // -------------------------------------------------------------------------
  describe("list", () => {
    it("makes a single activity request", async () => {
      fetchSpy.mockResolvedValueOnce(
        mockFetchResponse({ activity: [ENTRY_2, ENTRY_1] }),
      );

      const endpoints = makeEndpoints();
      await endpoints.list();

      expect(fetchSpy).toHaveBeenCalledOnce();
      const url = new URL(fetchSpy.mock.calls[0][0] as string);
      expect(url.pathname).toBe(`/api/activity/v1/${ORG}/${DOC_ID}`);
      expect(url.searchParams.get("order")).toBe("desc");
      expect(url.searchParams.get("limit")).toBe("50");
      // Client clock skew must not hide server activity.
      expect(url.searchParams.has("to")).toBe(false);
    });

    it("applies the product grouping defaults", async () => {
      fetchSpy.mockResolvedValueOnce(mockFetchResponse({ activity: [] }));

      const endpoints = makeEndpoints();
      await endpoints.list();

      const url = new URL(fetchSpy.mock.calls[0][0] as string);
      expect(url.searchParams.get("groupMaxGap")).toBe("3600000");
      expect(url.searchParams.get("groupMaxDuration")).toBe("43200000");
      expect(url.searchParams.get("mergeUsers")).toBe("true");
      expect(url.searchParams.get("customAttributions")).toBe("true");
      // `group` is only forwarded when explicitly configured.
      expect(url.searchParams.get("group")).toBe(null);
    });

    it("forwards explicitly configured grouping options", async () => {
      fetchSpy.mockResolvedValueOnce(mockFetchResponse({ activity: [] }));

      const endpoints = createYHubVersioningEndpoints({
        baseUrl: BASE_URL,
        org: ORG,
        docId: DOC_ID,
        activityParams: {
          group: "true",
          groupMaxGap: "1000",
          groupMaxDuration: "5000",
          mergeUsers: "false",
        },
      })(BlockNoteEditor.create());
      await endpoints.list();

      const url = new URL(fetchSpy.mock.calls[0][0] as string);
      expect(url.searchParams.get("group")).toBe("true");
      expect(url.searchParams.get("groupMaxGap")).toBe("1000");
      expect(url.searchParams.get("groupMaxDuration")).toBe("5000");
      expect(url.searchParams.get("mergeUsers")).toBe("false");
    });

    it("makes the newest activity entry the current version", async () => {
      fetchSpy.mockResolvedValueOnce(
        mockFetchResponse({ activity: [ENTRY_2, ENTRY_1] }),
      );

      const endpoints = makeEndpoints();
      const { current, snapshots } = await endpoints.list();

      expect(current).toEqual(SNAPSHOT_2);
      expect(snapshots).toEqual([SNAPSHOT_1]);
    });

    it("merges activity entries that share a `to`, unioning the authors", async () => {
      fetchSpy.mockResolvedValueOnce(
        mockFetchResponse({
          activity: [
            { from: 2000, to: 2000, by: "user-1" },
            { from: 2000, to: 2000, by: "user-2, user-1" },
            { from: 1000, to: 1000, by: "user-3" },
          ],
        }),
      );

      const endpoints = makeEndpoints();
      const { current, snapshots } = await endpoints.list();

      expect(current).toEqual({
        id: "2000",
        createdAt: 2000,
        by: ["user-1", "user-2"],
      });
      expect(snapshots).toHaveLength(1);
      expect(snapshots[0]!.id).toBe("1000");
    });

    it("surfaces an entry's custom attributions as metadata", async () => {
      fetchSpy.mockResolvedValueOnce(
        mockFetchResponse({
          activity: [
            {
              from: 2000,
              to: 2000,
              customAttributions: [{ k: "source", v: "import" }],
            },
            {
              // Same version, a second attribution: both are kept.
              from: 2000,
              to: 2000,
              customAttributions: [{ k: "ticket", v: "BN-1" }],
            },
          ],
        }),
      );

      const endpoints = makeEndpoints();
      const { current } = await endpoints.list();

      expect(current.metadata).toEqual({ source: "import", ticket: "BN-1" });
    });

    it("lets a stored entry override an activity attribution", async () => {
      const doc = new Y.Doc();
      const { endpoints } = makeCollabEndpoints(doc);

      doc.get("__bn_versions").push([{ id: ENTRY_1.to, source: "restore" }]);

      fetchSpy.mockResolvedValueOnce(
        mockFetchResponse({
          activity: [
            ENTRY_2,
            { ...ENTRY_1, customAttributions: [{ k: "source", v: "import" }] },
          ],
        }),
      );

      const { snapshots } = await endpoints.list();

      expect(snapshots[0]!.metadata).toEqual({ source: "restore" });
    });

    it("overlays stored names, restoredFrom and metadata onto matching rows", async () => {
      const doc = new Y.Doc();
      const { endpoints } = makeCollabEndpoints(doc);

      doc
        .get("__bn_versions")
        .push([
          { id: ENTRY_1.to, name: "Named", restoredFrom: 42, copyOf: "abc" },
        ]);

      fetchSpy.mockResolvedValueOnce(
        mockFetchResponse({ activity: [ENTRY_2, ENTRY_1] }),
      );

      const { snapshots } = await endpoints.list();

      expect(snapshots).toEqual([
        {
          ...SNAPSHOT_1,
          name: "Named",
          // The stored `to` is the restored version's whole identity.
          restoredFrom: { id: "42", createdAt: 42 },
          metadata: { copyOf: "abc" },
        },
      ]);
    });

    it("keeps the last stored element for an id", async () => {
      const doc = new Y.Doc();
      const { endpoints } = makeCollabEndpoints(doc);

      doc.get("__bn_versions").push([{ id: ENTRY_1.to, name: "First" }]);
      doc.get("__bn_versions").push([{ id: ENTRY_1.to, name: "Second" }]);

      fetchSpy.mockResolvedValueOnce(
        mockFetchResponse({ activity: [ENTRY_2, ENTRY_1] }),
      );

      const { snapshots } = await endpoints.list();

      expect(snapshots[0]!.name).toBe("Second");
    });

    it("adds a row for a stored entry with no matching activity", async () => {
      const doc = new Y.Doc();
      const { endpoints } = makeCollabEndpoints(doc);

      const orphanTo = ENTRY_2.to + 1000;
      doc.get("__bn_versions").push([{ id: orphanTo, name: "Orphan" }]);

      fetchSpy.mockResolvedValueOnce(
        mockFetchResponse({ activity: [ENTRY_2, ENTRY_1] }),
      );

      const { current, snapshots } = await endpoints.list();

      // Newer than every activity entry, yet the newest *activity* entry is
      // still the current version — the orphan just sorts above the rest.
      expect(current).toEqual(SNAPSHOT_2);
      expect(snapshots.map((s) => s.id)).toEqual([
        String(orphanTo),
        SNAPSHOT_1.id,
      ]);
      expect(snapshots[0]).toEqual({
        id: String(orphanTo),
        createdAt: orphanTo,
        name: "Orphan",
        restoredFrom: undefined,
        metadata: undefined,
      });
    });

    it("sorts stored versions newest-first", async () => {
      fetchSpy.mockResolvedValueOnce(
        mockFetchResponse({
          activity: [
            { from: 1000, to: 1000 },
            { from: 3000, to: 3000 },
            { from: 2000, to: 2000 },
          ],
        }),
      );

      const endpoints = makeEndpoints();
      const { current, snapshots } = await endpoints.list();

      expect(current.createdAt).toBe(3000);
      expect(snapshots.map((s) => s.createdAt)).toEqual([2000, 1000]);
    });

    it("falls back to an empty current row when there is no activity", async () => {
      fetchSpy.mockResolvedValueOnce(mockFetchResponse({ activity: [] }));

      const endpoints = makeEndpoints();
      const { current, snapshots } = await endpoints.list();

      expect(current.id).toBe(String(current.createdAt));
      expect(snapshots).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // create (name the current version)
  // -------------------------------------------------------------------------
  describe("create", () => {
    it("names the newest activity entry via a limit-1 fetch", async () => {
      const doc = new Y.Doc();
      const { endpoints, fragment } = makeCollabEndpoints(doc);

      fetchSpy.mockResolvedValueOnce(
        mockFetchResponse({ activity: [ENTRY_2] }),
      );

      const snapshot = await endpoints.create!(fragment, {
        name: "My Version",
      });

      // No PATCH: naming a version only writes to the live doc.
      expect(fetchSpy).toHaveBeenCalledOnce();
      const url = new URL(fetchSpy.mock.calls[0][0] as string);
      expect(url.pathname).toBe(`/api/activity/v1/${ORG}/${DOC_ID}`);
      expect(url.searchParams.get("limit")).toBe("1");
      expect(url.searchParams.get("order")).toBe("desc");

      expect(versionEntries(doc)).toEqual([
        { id: ENTRY_2.to, name: "My Version" },
      ]);
      expect(snapshot).toEqual({ ...SNAPSHOT_2, name: "My Version" });
    });

    it("keeps other metadata on the entry it names", async () => {
      const doc = new Y.Doc();
      const { endpoints, fragment } = makeCollabEndpoints(doc);

      doc.get("__bn_versions").push([{ id: ENTRY_2.to, restoredFrom: 42 }]);
      fetchSpy.mockResolvedValueOnce(
        mockFetchResponse({ activity: [ENTRY_2] }),
      );

      await endpoints.create!(fragment, { name: "After restore" });

      expect(versionEntries(doc)).toEqual([
        { id: ENTRY_2.to, restoredFrom: 42, name: "After restore" },
      ]);
    });

    it("labels nothing when created without a name", async () => {
      const doc = new Y.Doc();
      const { endpoints, fragment } = makeCollabEndpoints(doc);

      fetchSpy.mockResolvedValueOnce(
        mockFetchResponse({ activity: [ENTRY_2] }),
      );

      const snapshot = await endpoints.create!(fragment, {});

      // No name to store: writing a bare `{ id }` entry would be junk.
      expect(versionEntries(doc)).toEqual([]);
      expect(snapshot).toEqual(SNAPSHOT_2);
    });

    it("keeps an existing name when created without one", async () => {
      const doc = new Y.Doc();
      const { endpoints, fragment } = makeCollabEndpoints(doc);

      doc.get("__bn_versions").push([{ id: ENTRY_2.to, name: "Existing" }]);
      fetchSpy.mockResolvedValueOnce(
        mockFetchResponse({ activity: [ENTRY_2] }),
      );

      const snapshot = await endpoints.create!(fragment, {});

      expect(versionEntries(doc)).toEqual([
        { id: ENTRY_2.to, name: "Existing" },
      ]);
      expect(snapshot).toEqual({ ...SNAPSHOT_2, name: "Existing" });
    });

    it("labels the newest entry even when activity order is configured asc", async () => {
      const doc = new Y.Doc();
      const fragment = doc.get("default", "XmlFragment") as unknown as Y.Node;
      (fragment as any).insert(0, ["hello"]);
      const editor = BlockNoteEditor.create({
        extensions: [ySyncStub(fragment)],
      });
      const endpoints = createYHubVersioningEndpoints({
        baseUrl: BASE_URL,
        org: ORG,
        docId: DOC_ID,
        activityParams: { order: "asc" },
      })(editor);

      fetchSpy.mockResolvedValueOnce(
        mockFetchResponse({ activity: [ENTRY_1] }),
      );

      await endpoints.create!(fragment, { name: "Named" });

      // The limit-1 lookup must force newest-first: an asc response would put
      // the oldest entry first, and the name would land on the wrong row.
      const url = new URL(fetchSpy.mock.calls[0][0] as string);
      expect(url.searchParams.get("order")).toBe("desc");
      expect(versionEntries(doc)).toEqual([{ id: ENTRY_1.to, name: "Named" }]);
    });

    it("throws when there is no live collaboration document", async () => {
      const endpoints = makeEndpoints();
      await expect(
        endpoints.create!(makeFragment(), { name: "fail" }),
      ).rejects.toThrow("Assert failed");
      // It fails before making any request.
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it("throws when YHub has recorded no activity", async () => {
      const doc = new Y.Doc();
      const { endpoints, fragment } = makeCollabEndpoints(doc);
      fetchSpy.mockResolvedValueOnce(mockFetchResponse({ activity: [] }));

      await expect(
        endpoints.create!(fragment, { name: "fail" }),
      ).rejects.toThrow("no activity");
    });
  });

  // -------------------------------------------------------------------------
  // getContent
  // -------------------------------------------------------------------------
  describe("getContent", () => {
    it("fetches the changeset by to=<snapshot.createdAt> with no activity lookup", async () => {
      const cs = makeChangeset();
      fetchSpy.mockResolvedValueOnce(mockFetchResponse(cs));

      const endpoints = makeEndpoints();
      const content = await endpoints.getContent(SNAPSHOT_1);

      expect(content).toBeInstanceOf(Uint8Array);
      expect(content.byteLength).toBeGreaterThan(0);

      // The version carries its own timestamp, so only the changeset is fetched.
      expect(fetchSpy).toHaveBeenCalledOnce();

      const url = new URL(fetchSpy.mock.calls[0][0] as string);
      expect(url.pathname).toBe(`/api/changeset/v1/${ORG}/${DOC_ID}`);
      expect(url.searchParams.get("ydoc")).toBe("true");
      expect(url.searchParams.get("to")).toBe(String(SNAPSHOT_1.createdAt));
      expect(url.searchParams.has("from")).toBe(false);
    });

    it("throws when changeset has no ydoc", async () => {
      fetchSpy.mockResolvedValueOnce(mockFetchResponse({}));

      const endpoints = makeEndpoints();
      await expect(endpoints.getContent(SNAPSHOT_1)).rejects.toThrow(
        "no document state",
      );
    });
  });

  // -------------------------------------------------------------------------
  // getAttributions
  // -------------------------------------------------------------------------
  describe("getAttributions", () => {
    it("fetches attributions between two versions", async () => {
      const endpoints = makeEndpoints();

      const cs = makeChangeset({ attributions: true });
      fetchSpy.mockResolvedValueOnce(mockFetchResponse(cs));

      try {
        await endpoints.getAttributions!(
          { kind: "snapshot", snapshot: SNAPSHOT_2 },
          SNAPSHOT_1,
        );
      } catch {
        // Expected — mock attributions aren't valid Y.ContentMap
      }

      expect(fetchSpy).toHaveBeenCalledOnce();
      const url = new URL(fetchSpy.mock.calls[0][0] as string);
      expect(url.searchParams.get("from")).toBe(String(SNAPSHOT_1.createdAt));
      expect(url.searchParams.get("to")).toBe(String(SNAPSHOT_2.createdAt));
      expect(url.searchParams.get("attributions")).toBe("true");
    });

    it("includes current-document attributions newer than the last listed version", async () => {
      const endpoints = makeEndpoints();
      const editTime = SNAPSHOT_2.createdAt + 1000;
      const changes = Y.createIdSet();
      changes.add(7, 0, 1);
      const latestAttributions = Y.createContentMap();
      Y.insertIntoIdMap(
        latestAttributions.inserts,
        Y.createIdMapFromIdSet(changes, [
          Y.createContentAttribute("insert", "new-peer"),
        ]),
      );

      fetchSpy.mockImplementation(
        async (input: Parameters<typeof fetch>[0]) => {
          const url = new URL(input instanceof Request ? input.url : input);
          const to = url.searchParams.get("to");
          // Model a server-side edit after the sidebar loaded its current row.
          const attributions =
            to === null || Number(to) >= editTime
              ? latestAttributions
              : Y.createContentMap();
          return mockFetchResponse({
            attributions: Y.encodeContentMap(attributions),
          });
        },
      );

      const attributions = await endpoints.getAttributions!(
        { kind: "current", snapshot: SNAPSHOT_2 },
        SNAPSHOT_1,
      );

      expect(Y.encodeContentMap(attributions)).toEqual(
        Y.encodeContentMap(latestAttributions),
      );
      expect(fetchSpy).toHaveBeenCalledOnce();
      const url = new URL(fetchSpy.mock.calls[0][0] as string);
      expect(url.searchParams.get("from")).toBe(String(SNAPSHOT_1.createdAt));
      expect(url.searchParams.has("to")).toBe(false);
    });

    it("uses from=0 when compareTo is omitted", async () => {
      const endpoints = makeEndpoints();

      const cs = makeChangeset({ attributions: true });
      fetchSpy.mockResolvedValueOnce(mockFetchResponse(cs));

      try {
        await endpoints.getAttributions!({
          kind: "snapshot",
          snapshot: SNAPSHOT_1,
        });
      } catch {
        // Expected
      }

      const url = new URL(fetchSpy.mock.calls[0][0] as string);
      expect(url.searchParams.get("from")).toBe("0");
    });

    it("throws when changeset has no attributions", async () => {
      const endpoints = makeEndpoints();

      fetchSpy.mockResolvedValueOnce(
        mockFetchResponse({ ydoc: new Uint8Array() }),
      );

      await expect(
        endpoints.getAttributions!({
          kind: "snapshot",
          snapshot: SNAPSHOT_1,
        }),
      ).rejects.toThrow("no attributions");
    });
  });

  // -------------------------------------------------------------------------
  // restore
  // -------------------------------------------------------------------------
  describe("restore", () => {
    it("requests one delayed history refresh with a configurable delay", () => {
      expect(makeEndpoints().refreshAfterRestoreMs).toBe(6000);
      const endpoints = createYHubVersioningEndpoints({
        baseUrl: BASE_URL,
        org: ORG,
        docId: DOC_ID,
        refreshAfterRestoreMs: 10000,
      })(BlockNoteEditor.create());
      expect(endpoints.refreshAfterRestoreMs).toBe(10000);
    });

    it("restores the exact boundary and deleted subtrees without reverting metadata or other roots", async () => {
      const server = new Y.Doc({ gc: false });
      const fragmentOnServer = server.get("default", "XmlFragment");
      const nested = new Y.Node();
      fragmentOnServer.push([nested]);
      nested.push(["Original nested content"]);
      const original = fragmentOnServer.toJSON();
      const snapshotUpdate = Y.encodeStateAsUpdate(server);
      const boundary = SNAPSHOT_1.createdAt;
      const changes = [
        { at: boundary, ids: Y.createContentIdsFromUpdate(snapshotUpdate) },
      ];
      server.on("update", (update: Uint8Array) => {
        changes.push({
          at: boundary + 1,
          ids: Y.createContentIdsFromUpdate(update),
        });
      });
      server.transact(() => {
        fragmentOnServer.delete(0, 1);
        fragmentOnServer.push(["New content"]);
        server.get("other-editor").push(["Keep this document"]);
        server
          .get("__bn_versions")
          .push([{ id: boundary, name: "Original version" }]);
      });

      // The client has GC enabled: it cannot discover the deleted subtree's
      // children itself, but the server still retains them for restoration.
      const doc = new Y.Doc();
      const { endpoints, fragment } = makeCollabEndpoints(doc);
      fragment.delete(0, fragment.length);
      Y.applyUpdate(doc, Y.encodeStateAsUpdate(server));
      let rolledBack = false;
      fetchSpy.mockImplementation(
        async (...[input, init]: Parameters<typeof fetch>) => {
          const url = new URL(input instanceof Request ? input.url : input);
          if (url.pathname.includes("/changeset/")) {
            return mockFetchResponse({ ydoc: snapshotUpdate });
          }
          if (url.pathname.includes("/activity/")) {
            const at = boundary + (rolledBack ? 2000 : 1000);
            return mockFetchResponse({ activity: [{ from: at, to: at }] });
          }
          if (url.pathname.includes("/ydoc/")) {
            expect(url.searchParams.get("gc")).toBe("false");
            return mockFetchResponse({ doc: Y.encodeStateAsUpdate(server) });
          }
          expect(url.pathname).toContain("/rollback/");
          if (!(init?.body instanceof Uint8Array)) {
            throw new Error("Expected an encoded rollback request");
          }
          const request = decodeAny(init.body) as {
            from: number;
            contentIds: Uint8Array;
          };
          expect(request.from).toBe(boundary + 1);
          const reverted = Y.intersectContentIds(
            Y.mergeContentIds(
              changes
                .filter((change) => change.at >= request.from)
                .map((change) => change.ids),
            ),
            Y.decodeContentIds(request.contentIds),
          );
          Y.undoContentIds(server, reverted);
          Y.applyUpdate(doc, Y.encodeStateAsUpdate(server));
          rolledBack = true;
          return mockFetchResponse({ success: true });
        },
      );

      await endpoints.restore!(fragment, SNAPSHOT_1);

      expect(fragment.toJSON()).toEqual(original);
      expect(doc.get("other-editor").toArray()).toEqual(["Keep this document"]);
      expect(versionEntries(doc)).toEqual([
        { id: boundary, name: "Original version" },
        { id: boundary + 1000, name: "Before restore" },
      ]);
      server.destroy();
      doc.destroy();
    });

    it("fetches content, rolls back and preserves the last observed head", async () => {
      const doc = new Y.Doc();
      const { endpoints, fragment } = makeCollabEndpoints(doc);
      const cs = makeChangeset();

      // 1: GET /changeset (getContentAt via to=<snapshot.createdAt>)
      fetchSpy.mockResolvedValueOnce(mockFetchResponse(cs));
      // 2: the head before the rollback
      fetchSpy.mockResolvedValueOnce(
        mockFetchResponse({ activity: [{ from: 8000, to: 8000 }] }),
      );
      // 3: retained document history; 4: POST /rollback
      fetchSpy.mockResolvedValueOnce(
        mockFetchResponse({ doc: Y.encodeStateAsUpdate(doc) }),
      );
      fetchSpy.mockResolvedValueOnce(mockFetchResponse({ success: true }));

      const content = await endpoints.restore!(fragment, SNAPSHOT_1);

      expect(fetchSpy).toHaveBeenCalledTimes(4);

      const csUrl = new URL(fetchSpy.mock.calls[0][0] as string);
      expect(csUrl.pathname).toBe(`/api/changeset/v1/${ORG}/${DOC_ID}`);
      expect(csUrl.searchParams.get("to")).toBe(String(SNAPSHOT_1.createdAt));

      const [rollbackUrl, rollbackInit] = fetchSpy.mock.calls[3];
      expect(rollbackUrl).toBe(`${BASE_URL}/rollback/v1/${ORG}/${DOC_ID}`);
      expect(rollbackInit.method).toBe("POST");

      // The pre-restore head is pinned by name: with the default grouping the
      // rollback can merge into the same row, which would swallow the state
      // being left behind.
      expect(versionEntries(doc)).toEqual([
        { id: 8000, name: "Before restore" },
      ]);
      expect(content).toBeInstanceOf(Uint8Array);
    });

    it.each([8000, 9000])(
      "accepts refreshed activity at %s without inferring a restore label",
      async (head) => {
        const doc = new Y.Doc();
        const { endpoints, fragment } = makeCollabEndpoints(doc);
        fetchSpy.mockResolvedValueOnce(mockFetchResponse(makeChangeset()));
        fetchSpy.mockResolvedValueOnce(
          mockFetchResponse({ activity: [{ from: 8000, to: 8000 }] }),
        );
        fetchSpy.mockResolvedValueOnce(
          mockFetchResponse({ doc: Y.encodeStateAsUpdate(doc) }),
        );
        fetchSpy.mockResolvedValueOnce(mockFetchResponse({ success: true }));

        await endpoints.restore!(fragment, SNAPSHOT_1);
        expect(fetchSpy).toHaveBeenCalledTimes(4);

        // The controller refreshes once: the result can be stale or contain
        // someone else's concurrent edit. Neither proves this is our rollback.
        fetchSpy.mockResolvedValueOnce(
          mockFetchResponse({ activity: [{ from: head, to: head }] }),
        );
        const { current } = await endpoints.list();
        expect(fetchSpy).toHaveBeenCalledTimes(5);
        expect(current.createdAt).toBe(head);
        expect(current.restoredFrom).toBeUndefined();
        expect(versionEntries(doc)).toEqual([
          { id: 8000, name: "Before restore" },
        ]);
      },
    );

    it("doesn't re-pin the pre-restore head when it's already addressable", async () => {
      const doc = new Y.Doc();
      const { endpoints, fragment } = makeCollabEndpoints(doc);

      // The pre-restore head already carries an entry (a named version), so
      // pinning it again would just duplicate it.
      doc.get("__bn_versions").push([{ id: 8000, name: "Pre-restore" }]);

      fetchSpy.mockResolvedValueOnce(mockFetchResponse(makeChangeset()));
      fetchSpy.mockResolvedValueOnce(
        mockFetchResponse({ activity: [{ from: 8000, to: 8000 }] }),
      );
      fetchSpy.mockResolvedValueOnce(
        mockFetchResponse({ doc: Y.encodeStateAsUpdate(doc) }),
      );
      fetchSpy.mockResolvedValueOnce(mockFetchResponse({ success: true }));

      await endpoints.restore!(fragment, SNAPSHOT_1);

      expect(versionEntries(doc)).toEqual([{ id: 8000, name: "Pre-restore" }]);
    });
  });

  // -------------------------------------------------------------------------
  // rename / remove
  // -------------------------------------------------------------------------
  describe("rename", () => {
    it("upserts the name onto the version's entry", async () => {
      const doc = new Y.Doc();
      const { endpoints } = makeCollabEndpoints(doc);

      await endpoints.rename!(SNAPSHOT_1, "New");

      expect(versionEntries(doc)).toEqual([{ id: ENTRY_1.to, name: "New" }]);

      await endpoints.rename!(SNAPSHOT_1, "Newer");

      expect(versionEntries(doc)).toEqual([{ id: ENTRY_1.to, name: "Newer" }]);
    });

    it("applies an upsert as a single Yjs transaction", async () => {
      const doc = new Y.Doc();
      const { endpoints } = makeCollabEndpoints(doc);

      doc.get("__bn_versions").push([{ id: ENTRY_1.to, name: "Old" }]);
      let transactions = 0;
      doc.on("afterTransaction", () => transactions++);

      // Replace-with-same-id: a delete and a push, riding one transaction.
      await endpoints.rename!(SNAPSHOT_1, "New");

      expect(transactions).toBe(1);
    });

    it("throws when the version id isn't a YHub server timestamp", async () => {
      const doc = new Y.Doc();
      const { endpoints } = makeCollabEndpoints(doc);

      await expect(
        endpoints.rename!({ id: "not-a-timestamp", createdAt: 0 }, "New"),
      ).rejects.toThrow("not a YHub server timestamp");
      // Nothing was written along the way.
      expect(versionEntries(doc)).toEqual([]);
    });

    it("clears the name but keeps the rest of the entry", async () => {
      const doc = new Y.Doc();
      const { endpoints } = makeCollabEndpoints(doc);

      doc
        .get("__bn_versions")
        .push([{ id: ENTRY_1.to, name: "Old", restoredFrom: 42 }]);

      await endpoints.rename!(SNAPSHOT_1, undefined);

      expect(versionEntries(doc)).toEqual([
        { id: ENTRY_1.to, restoredFrom: 42 },
      ]);
    });

    it("drops the entry entirely when clearing leaves nothing behind", async () => {
      const doc = new Y.Doc();
      const { endpoints } = makeCollabEndpoints(doc);

      doc.get("__bn_versions").push([{ id: ENTRY_1.to, name: "Old" }]);

      await endpoints.rename!(SNAPSHOT_1, "");

      expect(versionEntries(doc)).toEqual([]);
    });

    it("throws when there is no live collaboration document", async () => {
      const endpoints = makeEndpoints();
      await expect(endpoints.rename!(SNAPSHOT_1, "x")).rejects.toThrow(
        "Assert failed",
      );
    });
  });

  describe("remove", () => {
    it("deletes the version's entry", async () => {
      const doc = new Y.Doc();
      const { endpoints } = makeCollabEndpoints(doc);

      doc.get("__bn_versions").push([{ id: ENTRY_1.to, name: "Old" }]);
      doc.get("__bn_versions").push([{ id: ENTRY_2.to, name: "Keep" }]);

      await endpoints.remove!(SNAPSHOT_1);

      expect(versionEntries(doc)).toEqual([{ id: ENTRY_2.to, name: "Keep" }]);
    });

    it("drops only the name, keeping the rest of the entry", async () => {
      const doc = new Y.Doc();
      const { endpoints } = makeCollabEndpoints(doc);

      doc
        .get("__bn_versions")
        .push([
          { id: ENTRY_1.to, name: "Old", restoredFrom: 42, copyOf: "abc" },
        ]);

      await endpoints.remove!(SNAPSHOT_1);

      expect(versionEntries(doc)).toEqual([
        { id: ENTRY_1.to, restoredFrom: 42, copyOf: "abc" },
      ]);
    });

    it("does nothing when the version has no stored entry", async () => {
      const doc = new Y.Doc();
      const { endpoints } = makeCollabEndpoints(doc);

      await endpoints.remove!(SNAPSHOT_1);

      expect(versionEntries(doc)).toEqual([]);
    });

    it("throws when the version id isn't a YHub server timestamp", async () => {
      const doc = new Y.Doc();
      const { endpoints } = makeCollabEndpoints(doc);

      doc.get("__bn_versions").push([{ id: ENTRY_1.to, name: "Old" }]);

      await expect(
        endpoints.remove!({ id: "not-a-timestamp", createdAt: 0 }),
      ).rejects.toThrow("not a YHub server timestamp");
      // Nothing was written or deleted along the way.
      expect(versionEntries(doc)).toEqual([{ id: ENTRY_1.to, name: "Old" }]);
    });
  });

  // -------------------------------------------------------------------------
  // error handling
  // -------------------------------------------------------------------------
  describe("error handling", () => {
    it("throws on non-OK HTTP responses", async () => {
      fetchSpy.mockResolvedValueOnce(
        new Response("Not Found", { status: 404, statusText: "Not Found" }),
      );

      const endpoints = makeEndpoints();
      await expect(endpoints.list()).rejects.toThrow(
        "YHub request failed: 404",
      );
    });
  });
});
