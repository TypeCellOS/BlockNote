import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vite-plus/test";
import { encodeAny } from "lib0/buffer";
import * as Y from "@y/y";

import {
  CURRENT_VERSION_ID,
  type VersionSnapshot,
} from "../../../extensions/Versioning/index.js";
import { createYHubVersioningEndpoints } from "../yhub.js";
import { BlockNoteEditor } from "../../../editor/BlockNoteEditor.js";
import { createExtension } from "../../../editor/BlockNoteExtension.js";

// ---------------------------------------------------------------------------
// Fixture data — version entries now carry an `id` custom attribution (UUID).
// ---------------------------------------------------------------------------

const VERSION_ENTRY_1 = {
  from: 1782218082853,
  to: 1782218082853,
  by: "user-1",
  customAttributions: [
    { k: "type", v: "version" },
    { k: "id", v: "uuid-version-1" },
    { k: "name", v: "Test Version 1" },
  ],
};

const VERSION_ENTRY_2 = {
  from: 1782218211312,
  to: 1782218211312,
  by: "user-2, user-3",
  customAttributions: [
    { k: "type", v: "version" },
    { k: "id", v: "uuid-version-2" },
    { k: "name", v: "Test Version 2" },
  ],
};

// Snapshots as produced by `list()` (see `activityToSnapshot`): the activity
// entry's `to` timestamp becomes both `createdAt` and `updatedAt`. The
// changeset/rollback APIs are now driven by these timestamps directly, so the
// endpoints no longer make an activity lookup to resolve them. The entry's
// comma-separated `by` user-ids are split into the snapshot's raw `by` array.
const SNAPSHOT_1: VersionSnapshot = {
  id: "uuid-version-1",
  name: "Test Version 1",
  createdAt: VERSION_ENTRY_1.to,
  updatedAt: VERSION_ENTRY_1.to,
  by: ["user-1"],
};

const SNAPSHOT_2: VersionSnapshot = {
  id: "uuid-version-2",
  name: "Test Version 2",
  createdAt: VERSION_ENTRY_2.to,
  updatedAt: VERSION_ENTRY_2.to,
  by: ["user-2", "user-3"],
};

const PATCH_RESPONSE = { success: true, message: "Document updated" };

function makeChangeset(
  opts: { nextDoc?: boolean; attributions?: boolean } = {},
) {
  const doc = new Y.Doc();
  const frag = doc.get("default", "XmlFragment");
  frag.insert(0, ["hello"]);
  return {
    prevDoc: Y.encodeStateAsUpdate(new Y.Doc()),
    ...(opts.nextDoc !== false ? { nextDoc: Y.encodeStateAsUpdate(doc) } : {}),
    ...(opts.attributions ? { attributions: new Uint8Array([0]) } : {}),
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const BASE_URL = "https://yhub.test";
const ORG = "test-org";
const DOC_ID = "test-doc";

// The factory returns a callback that receives the editor instance (used to
// stamp `create`d snapshots with the current cursor user's id). Author ids are
// passed through raw on `VersionSnapshot.by` — resolving them to user info is
// the view layer's job, not the endpoints'. These tests create a bare editor
// with no collaboration extensions, so `create` gets no author id.
function makeEndpoints() {
  const editor = BlockNoteEditor.create();
  return createYHubVersioningEndpoints({
    baseUrl: BASE_URL,
    org: ORG,
    docId: DOC_ID,
    activityLimit: 50,
  })(editor);
}

// A lightweight stand-in for the real `ySync` extension. `getVersionNamesMap`
// in yhub.ts reads the live collaboration doc exclusively via
// `editor.getExtension("ySync")?.fragment.doc`, so a stub that just exposes the
// fragment is enough to exercise the mutable `__bn_version_names` name store
// without wiring up the full collaboration/prosemirror sync machinery.
const ySyncStub = (fragment: Y.Type) =>
  createExtension({ key: "ySync", fragment } as any);

// Build endpoints against an editor that has a `ySync` extension whose fragment
// belongs to `doc`, so the mutable version-name store on `doc` is reachable.
function makeCollabEndpoints(doc: Y.Doc) {
  const fragment = doc.get("default", "XmlFragment") as unknown as Y.Type;
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

function mockFetchResponse(body: unknown, status = 200) {
  const encoded = encodeAny(body);
  return new Response(encoded as Blob | BufferSource, {
    status,
    statusText: status === 200 ? "OK" : "Error",
  });
}

function makeFragment(): Y.Type {
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
    it("returns version-tagged entries using the id attribution as snapshot id", async () => {
      fetchSpy.mockResolvedValueOnce(
        mockFetchResponse([VERSION_ENTRY_2, VERSION_ENTRY_1]),
      );
      // Latest edit == latest version → no "current version" entry.
      fetchSpy.mockResolvedValueOnce(mockFetchResponse([VERSION_ENTRY_2]));

      const endpoints = makeEndpoints();
      const snapshots = await endpoints.list();

      expect(snapshots).toHaveLength(2);
      expect(snapshots[0].id).toBe("uuid-version-2");
      expect(snapshots[0].name).toBe("Test Version 2");
      // The comma-separated `by` user-ids are split into a raw id array —
      // never resolved to usernames here (that's the view layer's job).
      expect(snapshots[0].by).toEqual(["user-2", "user-3"]);
      expect(snapshots[0].secondaryLabel).toBeUndefined();
      expect(snapshots[1].id).toBe("uuid-version-1");
      expect(snapshots[1].name).toBe("Test Version 1");
      expect(snapshots[1].by).toEqual(["user-1"]);
    });

    it("fetches the full activity timeline (no type:version filter) with grouping defaults", async () => {
      // First call: full activity timeline. Second call: latest edit of any kind.
      fetchSpy.mockResolvedValueOnce(mockFetchResponse([]));
      fetchSpy.mockResolvedValueOnce(mockFetchResponse([]));

      const endpoints = makeEndpoints();
      await endpoints.list();

      expect(fetchSpy).toHaveBeenCalledTimes(2);
      const versionUrl = new URL(fetchSpy.mock.calls[0][0] as string);
      expect(versionUrl.pathname).toBe(`/activity/${ORG}/${DOC_ID}`);
      // The `type:version` overlay filter is dropped so history entries are
      // returned too.
      expect(versionUrl.searchParams.get("withCustomAttributions")).toBe(null);
      expect(versionUrl.searchParams.get("customAttributions")).toBe("true");
      // Grouping default is applied.
      expect(versionUrl.searchParams.get("groupMaxGap")).toBe("60000");

      // The current-version probe fetches the latest entry of *any* type.
      const currentUrl = new URL(fetchSpy.mock.calls[1][0] as string);
      expect(currentUrl.pathname).toBe(`/activity/${ORG}/${DOC_ID}`);
      expect(currentUrl.searchParams.get("limit")).toBe("1");
      expect(currentUrl.searchParams.has("withCustomAttributions")).toBe(false);
    });

    it("forwards group + groupMaxDuration params when configured", async () => {
      fetchSpy.mockResolvedValueOnce(mockFetchResponse([]));
      fetchSpy.mockResolvedValueOnce(mockFetchResponse([]));

      const endpoints = createYHubVersioningEndpoints({
        baseUrl: BASE_URL,
        org: ORG,
        docId: DOC_ID,
        activityLimit: 50,
        group: true,
        groupMaxDuration: 5000,
      })(BlockNoteEditor.create());
      await endpoints.list();

      const versionUrl = new URL(fetchSpy.mock.calls[0][0] as string);
      expect(versionUrl.searchParams.get("group")).toBe("true");
      expect(versionUrl.searchParams.get("groupMaxDuration")).toBe("5000");
    });

    it("omits group params by default while keeping the groupMaxGap default", async () => {
      fetchSpy.mockResolvedValueOnce(mockFetchResponse([]));
      fetchSpy.mockResolvedValueOnce(mockFetchResponse([]));

      // `makeEndpoints` builds the factory with no group/groupMaxDuration opts.
      const endpoints = makeEndpoints();
      await endpoints.list();

      const versionUrl = new URL(fetchSpy.mock.calls[0][0] as string);
      expect(versionUrl.searchParams.get("group")).toBe(null);
      expect(versionUrl.searchParams.get("groupMaxDuration")).toBe(null);
      expect(versionUrl.searchParams.get("groupMaxGap")).toBe("60000");
    });

    it("maps both named version entries and plain history entries", async () => {
      const namedEntry = {
        from: 2000,
        to: 2000,
        by: "user-1",
        customAttributions: [
          { k: "type", v: "version" },
          { k: "id", v: "v1" },
          { k: "name", v: "Named" },
        ],
      };
      const historyEntry = {
        from: 1000,
        to: 1000,
        by: "user-2",
      };
      fetchSpy.mockResolvedValueOnce(
        mockFetchResponse([namedEntry, historyEntry]),
      );
      // Current-version probe: latest edit == the named entry's `to`, so no
      // synthetic current row.
      fetchSpy.mockResolvedValueOnce(mockFetchResponse([namedEntry]));

      const endpoints = makeEndpoints();
      const snapshots = await endpoints.list();

      const named = snapshots.find((s) => s.name === "Named");
      expect(named).toBeDefined();
      expect(named!.id).toBe("v1");

      // `historyEntry` is at index 1 in the mocked entries array, so its
      // history id embeds that index: `history-<to>-<index>`.
      const history = snapshots.find((s) => s.id === "history-1000-1");
      expect(history).toBeDefined();
      expect(history!.name).toBeUndefined();
    });

    it("returns empty array when no versions exist", async () => {
      fetchSpy.mockResolvedValueOnce(mockFetchResponse([]));
      fetchSpy.mockResolvedValueOnce(mockFetchResponse([]));

      const endpoints = makeEndpoints();
      const snapshots = await endpoints.list();

      expect(snapshots).toEqual([]);
    });

    it("sorts snapshots newest-first", async () => {
      fetchSpy.mockResolvedValueOnce(
        mockFetchResponse([VERSION_ENTRY_1, VERSION_ENTRY_2]),
      );
      fetchSpy.mockResolvedValueOnce(mockFetchResponse([VERSION_ENTRY_2]));

      const endpoints = makeEndpoints();
      const snapshots = await endpoints.list();

      expect(snapshots[0].createdAt).toBeGreaterThan(snapshots[1].createdAt);
    });

    it("silently skips entries without an id attribution", async () => {
      const noIdEntry = {
        from: 1782218082853,
        to: 1782218082853,
        by: "Bad Entry",
        customAttributions: [{ k: "type", v: "version" }],
      };
      fetchSpy.mockResolvedValueOnce(
        mockFetchResponse([VERSION_ENTRY_1, noIdEntry]),
      );
      fetchSpy.mockResolvedValueOnce(mockFetchResponse([VERSION_ENTRY_1]));

      const endpoints = makeEndpoints();
      const snapshots = await endpoints.list();

      expect(snapshots).toHaveLength(1);
      expect(snapshots[0].id).toBe("uuid-version-1");
    });

    it("prefers the mutable __bn_version_names name over the attribution name", async () => {
      const doc = new Y.Doc();
      // The `ySync` extension's fragment belongs to `doc`, so the mutable
      // name store on `doc` is what `getVersionNamesMap` reads.
      const { endpoints } = makeCollabEndpoints(doc);

      // Rename version "v1" in the mutable store on the live doc.
      doc.get("__bn_version_names").setAttr("v1", "Renamed");

      const versionEntry = {
        from: 1782218082853,
        to: 1782218082853,
        by: "user-1",
        customAttributions: [
          { k: "type", v: "version" },
          { k: "id", v: "v1" },
          { k: "name", v: "Original" },
        ],
      };
      // 1: activity fetch (version markers). 2: current-version probe — return
      // the same entry so there's no newer edit and no synthetic current row.
      fetchSpy.mockResolvedValueOnce(mockFetchResponse([versionEntry]));
      fetchSpy.mockResolvedValueOnce(mockFetchResponse([versionEntry]));

      const snapshots = await endpoints.list();

      expect(snapshots).toHaveLength(1);
      expect(snapshots[0].id).toBe("v1");
      expect(snapshots[0].name).toBe("Renamed");
    });

    it("falls back to the attribution name when the store has no entry", async () => {
      fetchSpy.mockResolvedValueOnce(mockFetchResponse([VERSION_ENTRY_1]));
      fetchSpy.mockResolvedValueOnce(mockFetchResponse([VERSION_ENTRY_1]));

      const endpoints = makeEndpoints();
      const snapshots = await endpoints.list();

      expect(snapshots).toHaveLength(1);
      expect(snapshots[0].name).toBe("Test Version 1");
    });

    it("prepends a 'current version' entry when there are edits beyond the latest version", async () => {
      // A more recent edit than VERSION_ENTRY_2, by a different author.
      const latestEdit = {
        from: 1782218300000,
        to: 1782218300000,
        by: "user-4",
      };
      fetchSpy.mockResolvedValueOnce(
        mockFetchResponse([VERSION_ENTRY_2, VERSION_ENTRY_1]),
      );
      fetchSpy.mockResolvedValueOnce(mockFetchResponse([latestEdit]));

      const endpoints = makeEndpoints();
      const snapshots = await endpoints.list();

      expect(snapshots).toHaveLength(3);
      expect(snapshots[0].id).toBe(CURRENT_VERSION_ID);
      expect(snapshots[0].createdAt).toBe(latestEdit.to);
      expect(snapshots[0].by).toEqual(["user-4"]);
      expect(snapshots[0].secondaryLabel).toBeUndefined();
      // The real version markers follow, newest-first.
      expect(snapshots[1].id).toBe("uuid-version-2");
      expect(snapshots[2].id).toBe("uuid-version-1");
    });
  });

  // -------------------------------------------------------------------------
  // create
  // -------------------------------------------------------------------------
  describe("create", () => {
    it("PATCHes with type:version, id, and name attributions and returns optimistic snapshot", async () => {
      fetchSpy.mockResolvedValueOnce(mockFetchResponse(PATCH_RESPONSE));

      const endpoints = makeEndpoints();
      const snapshot = await endpoints.create!(makeFragment(), {
        name: "My Version",
      });

      // Only one fetch call (PATCH) — no activity fetch
      expect(fetchSpy).toHaveBeenCalledOnce();
      const [patchUrl, patchInit] = fetchSpy.mock.calls[0];
      expect(patchUrl).toBe(`${BASE_URL}/ydoc/${ORG}/${DOC_ID}`);
      expect(patchInit.method).toBe("PATCH");
      expect(patchInit.body).toBeInstanceOf(Uint8Array);

      // Optimistic snapshot has a UUID id and the provided name. With no
      // yCursor extension there's no current user to attribute it to.
      expect(snapshot.id).toMatch(/^[0-9a-f-]+$/);
      expect(snapshot.name).toBe("My Version");
      expect(snapshot.createdAt).toBeGreaterThan(0);
      expect(snapshot.by).toBeUndefined();
    });

    it("stamps the optimistic snapshot with the cursor user's id", async () => {
      fetchSpy.mockResolvedValueOnce(mockFetchResponse(PATCH_RESPONSE));

      // Stub the editor so the yCursor extension reports a current user.
      const editor = {
        getExtension: (key: string) =>
          key === "yCursor"
            ? {
                getUser: () => ({ id: "user-1", name: "Alice", color: "#f00" }),
              }
            : undefined,
      } as unknown as BlockNoteEditor<any, any, any>;
      const endpoints = createYHubVersioningEndpoints({
        baseUrl: BASE_URL,
        org: ORG,
        docId: DOC_ID,
      })(editor);

      const snapshot = await endpoints.create!(makeFragment(), {
        name: "My Version",
      });

      expect(snapshot.by).toBe("user-1");
      // The PATCH is attributed to the same user.
      const patchUrl = new URL(fetchSpy.mock.calls[0][0] as string);
      expect(patchUrl.searchParams.get("userid")).toBe("user-1");
    });

    it("creates a version without a name", async () => {
      fetchSpy.mockResolvedValueOnce(mockFetchResponse(PATCH_RESPONSE));

      const endpoints = makeEndpoints();
      const snapshot = await endpoints.create!(makeFragment());

      expect(snapshot.name).toBeUndefined();
      expect(snapshot.id).toMatch(/^[0-9a-f-]+$/);
    });

    it("writes the version name into the __bn_version_names Y.Map on create", async () => {
      const doc = new Y.Doc();
      const { endpoints, fragment } = makeCollabEndpoints(doc);

      fetchSpy.mockResolvedValueOnce(mockFetchResponse({ success: true }));

      const snapshot = await endpoints.create!(fragment as any, {
        name: "My Version",
      });

      const names = doc.get("__bn_version_names");
      expect(names.getAttr(snapshot.id as string)).toBe("My Version");
    });

    it("throws when the fragment is not attached to a doc", async () => {
      const endpoints = makeEndpoints();
      const detached = { doc: null } as unknown as Y.Type;
      await expect(
        endpoints.create!(detached, { name: "fail" }),
      ).rejects.toThrow("not attached to a Y.Doc");
    });

    it("getContent works on the returned snapshot without an extra lookup", async () => {
      fetchSpy.mockResolvedValueOnce(mockFetchResponse(PATCH_RESPONSE));
      const cs = makeChangeset();
      fetchSpy.mockResolvedValueOnce(mockFetchResponse(cs));

      const endpoints = makeEndpoints();
      const snapshot = await endpoints.create!(makeFragment(), {
        name: "new",
      });

      const content = await endpoints.getContent(snapshot);
      expect(content).toBeInstanceOf(Uint8Array);
      // PATCH + changeset — the timestamp comes from the snapshot itself, so
      // there's no activity lookup.
      expect(fetchSpy).toHaveBeenCalledTimes(2);
      const url = new URL(fetchSpy.mock.calls[1][0] as string);
      expect(url.searchParams.get("to")).toBe(String(snapshot.createdAt));
    });
  });

  // -------------------------------------------------------------------------
  // getContent
  // -------------------------------------------------------------------------
  describe("getContent", () => {
    it("fetches the changeset by to=<snapshot.createdAt> with no activity lookup", async () => {
      // changeset fetch
      const cs = makeChangeset();
      fetchSpy.mockResolvedValueOnce(mockFetchResponse(cs));

      const endpoints = makeEndpoints();
      const content = await endpoints.getContent(SNAPSHOT_1);

      expect(content).toBeInstanceOf(Uint8Array);
      expect(content.byteLength).toBeGreaterThan(0);

      // The snapshot carries its own timestamp, so only the changeset is fetched.
      expect(fetchSpy).toHaveBeenCalledOnce();

      // changeset reconstructed by timestamp, NOT by custom attribution
      const url = new URL(fetchSpy.mock.calls[0][0] as string);
      expect(url.pathname).toBe(`/changeset/${ORG}/${DOC_ID}`);
      expect(url.searchParams.get("ydoc")).toBe("true");
      expect(url.searchParams.get("to")).toBe(String(SNAPSHOT_1.createdAt));
      expect(url.searchParams.has("from")).toBe(false);
      expect(url.searchParams.has("withCustomAttributions")).toBe(false);
    });

    it("throws when changeset has no nextDoc", async () => {
      fetchSpy.mockResolvedValueOnce(
        mockFetchResponse({ prevDoc: new Uint8Array() }),
      );

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

      // changeset fetch (timestamps come straight from the snapshots)
      const cs = makeChangeset({ attributions: true });
      fetchSpy.mockResolvedValueOnce(mockFetchResponse(cs));

      try {
        await endpoints.getAttributions!(SNAPSHOT_2, SNAPSHOT_1);
      } catch {
        // Expected — mock attributions aren't valid Y.ContentMap
      }

      // Only the changeset is fetched — no activity lookups.
      expect(fetchSpy).toHaveBeenCalledOnce();
      const url = new URL(fetchSpy.mock.calls[0][0] as string);
      expect(url.searchParams.get("from")).toBe(String(SNAPSHOT_1.createdAt));
      expect(url.searchParams.get("to")).toBe(String(SNAPSHOT_2.createdAt));
      expect(url.searchParams.get("attributions")).toBe("true");
    });

    it("uses from=0 when compareTo is omitted", async () => {
      const endpoints = makeEndpoints();

      // changeset fetch
      const cs = makeChangeset({ attributions: true });
      fetchSpy.mockResolvedValueOnce(mockFetchResponse(cs));

      try {
        await endpoints.getAttributions!(SNAPSHOT_1);
      } catch {
        // Expected
      }

      const url = new URL(fetchSpy.mock.calls[0][0] as string);
      expect(url.searchParams.get("from")).toBe("0");
    });

    it("throws when changeset has no attributions", async () => {
      const endpoints = makeEndpoints();

      // changeset without attributions
      fetchSpy.mockResolvedValueOnce(
        mockFetchResponse({ nextDoc: new Uint8Array() }),
      );

      await expect(endpoints.getAttributions!(SNAPSHOT_1)).rejects.toThrow(
        "no attributions",
      );
    });
  });

  // -------------------------------------------------------------------------
  // restore
  // -------------------------------------------------------------------------
  describe("restore", () => {
    it("fetches content and issues rollback (no backup)", async () => {
      const endpoints = makeEndpoints();
      const cs = makeChangeset();

      // 1: GET /changeset (getContentAt via to=<snapshot.createdAt>)
      fetchSpy.mockResolvedValueOnce(mockFetchResponse(cs));
      // 2: POST /rollback
      fetchSpy.mockResolvedValueOnce(mockFetchResponse({ success: true }));

      const content = await endpoints.restore!(makeFragment(), SNAPSHOT_1);

      // No backup PATCH and no activity lookup — just changeset + rollback.
      expect(fetchSpy).toHaveBeenCalledTimes(2);

      // 1st call: GET changeset by timestamp
      const csUrl = new URL(fetchSpy.mock.calls[0][0] as string);
      expect(csUrl.pathname).toBe(`/changeset/${ORG}/${DOC_ID}`);
      expect(csUrl.searchParams.get("to")).toBe(String(SNAPSHOT_1.createdAt));

      // 2nd call: POST rollback
      const [rollbackUrl, rollbackInit] = fetchSpy.mock.calls[1];
      expect(rollbackUrl).toContain(`/rollback/${ORG}/${DOC_ID}`);
      expect(rollbackInit.method).toBe("POST");

      expect(content).toBeInstanceOf(Uint8Array);
    });
  });

  // -------------------------------------------------------------------------
  // rename
  // -------------------------------------------------------------------------
  describe("rename", () => {
    it("provides a rename endpoint", () => {
      const endpoints = makeEndpoints();
      expect(typeof endpoints.rename).toBe("function");
    });

    it("rename sets the name in the Y.Map", async () => {
      const doc = new Y.Doc();
      const { endpoints, fragment } = makeCollabEndpoints(doc);

      fetchSpy.mockResolvedValueOnce(mockFetchResponse({ success: true }));
      const snapshot = await endpoints.create!(fragment as any, {
        name: "Old",
      });

      await endpoints.rename!(snapshot, "New");

      const names = doc.get("__bn_version_names");
      expect(names.getAttr(snapshot.id as string)).toBe("New");
    });

    it("rename with no name clears the entry", async () => {
      const doc = new Y.Doc();
      const { endpoints, fragment } = makeCollabEndpoints(doc);

      fetchSpy.mockResolvedValueOnce(mockFetchResponse({ success: true }));
      const snapshot = await endpoints.create!(fragment as any, {
        name: "Old",
      });

      await endpoints.rename!(snapshot, undefined);

      const names = doc.get("__bn_version_names");
      expect(names.hasAttr(snapshot.id as string)).toBe(false);
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
