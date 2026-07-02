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

// ---------------------------------------------------------------------------
// Fixture data — version entries now carry an `id` custom attribution (UUID).
// ---------------------------------------------------------------------------

const VERSION_ENTRY_1 = {
  from: 1782218082853,
  to: 1782218082853,
  by: "Charlie Brown",
  customAttributions: [
    { k: "type", v: "version" },
    { k: "id", v: "uuid-version-1" },
    { k: "name", v: "Test Version 1" },
  ],
};

const VERSION_ENTRY_2 = {
  from: 1782218211312,
  to: 1782218211312,
  by: "Dilbert Adams",
  customAttributions: [
    { k: "type", v: "version" },
    { k: "id", v: "uuid-version-2" },
    { k: "name", v: "Test Version 2" },
  ],
};

// Snapshots as produced by `list()` (see `activityToSnapshot`): the activity
// entry's `to` timestamp becomes both `createdAt` and `updatedAt`. The
// changeset/rollback APIs are now driven by these timestamps directly, so the
// endpoints no longer make an activity lookup to resolve them.
const SNAPSHOT_1: VersionSnapshot = {
  id: "uuid-version-1",
  name: "Test Version 1",
  createdAt: VERSION_ENTRY_1.to,
  updatedAt: VERSION_ENTRY_1.to,
  secondaryLabel: VERSION_ENTRY_1.by,
};

const SNAPSHOT_2: VersionSnapshot = {
  id: "uuid-version-2",
  name: "Test Version 2",
  createdAt: VERSION_ENTRY_2.to,
  updatedAt: VERSION_ENTRY_2.to,
  secondaryLabel: VERSION_ENTRY_2.by,
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

// The factory now returns a callback that receives the editor instance (used to
// resolve author ids to usernames via the collaboration user store on the YSync
// extension). These tests create a bare editor with no collaboration/user store,
// so author labels stay as the raw `by` ids.
function makeEndpoints() {
  const editor = BlockNoteEditor.create();
  return createYHubVersioningEndpoints({
    baseUrl: BASE_URL,
    org: ORG,
    docId: DOC_ID,
    activityLimit: 50,
  })(editor);
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
      expect(snapshots[0].secondaryLabel).toBe("Dilbert Adams");
      expect(snapshots[1].id).toBe("uuid-version-1");
      expect(snapshots[1].name).toBe("Test Version 1");
    });

    it("passes withCustomAttributions=type:version to the API", async () => {
      // First call: version markers. Second call: latest edit of any kind.
      fetchSpy.mockResolvedValueOnce(mockFetchResponse([]));
      fetchSpy.mockResolvedValueOnce(mockFetchResponse([]));

      const endpoints = makeEndpoints();
      await endpoints.list();

      expect(fetchSpy).toHaveBeenCalledTimes(2);
      const versionUrl = new URL(fetchSpy.mock.calls[0][0] as string);
      expect(versionUrl.pathname).toBe(`/activity/${ORG}/${DOC_ID}`);
      expect(versionUrl.searchParams.get("withCustomAttributions")).toBe(
        "type:version",
      );
      expect(versionUrl.searchParams.get("customAttributions")).toBe("true");

      // The current-version probe fetches the latest entry of *any* type.
      const currentUrl = new URL(fetchSpy.mock.calls[1][0] as string);
      expect(currentUrl.pathname).toBe(`/activity/${ORG}/${DOC_ID}`);
      expect(currentUrl.searchParams.get("limit")).toBe("1");
      expect(currentUrl.searchParams.has("withCustomAttributions")).toBe(false);
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

    it("prepends a 'current version' entry when there are edits beyond the latest version", async () => {
      // A more recent edit than VERSION_ENTRY_2, by a different author.
      const latestEdit = {
        from: 1782218300000,
        to: 1782218300000,
        by: "Eve Online",
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
      expect(snapshots[0].secondaryLabel).toBe("Eve Online");
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

      // Optimistic snapshot has a UUID id and the provided name
      expect(snapshot.id).toMatch(/^[0-9a-f-]+$/);
      expect(snapshot.name).toBe("My Version");
      expect(snapshot.createdAt).toBeGreaterThan(0);
    });

    it("creates a version without a name", async () => {
      fetchSpy.mockResolvedValueOnce(mockFetchResponse(PATCH_RESPONSE));

      const endpoints = makeEndpoints();
      const snapshot = await endpoints.create!(makeFragment());

      expect(snapshot.name).toBeUndefined();
      expect(snapshot.id).toMatch(/^[0-9a-f-]+$/);
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
  // updateSnapshotName is NOT provided
  // -------------------------------------------------------------------------
  describe("updateSnapshotName", () => {
    it("is not provided (attributions are immutable)", () => {
      const endpoints = makeEndpoints();
      expect(endpoints.updateSnapshotName).toBeUndefined();
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
