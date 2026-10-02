/** @vitest-environment node */
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  expectTypeOf,
  it,
  vi,
} from "vite-plus/test";
import { decodeAny, encodeAny } from "lib0/buffer";
import * as Y from "@y/y";

import { BlockNoteEditor } from "../../../editor/BlockNoteEditor.js";
import {
  VersioningExtension,
  type VersionSnapshot,
  type VersionCreateOptions,
} from "../../../extensions/Versioning/index.js";
import { withCollaboration } from "../../extensions/index.js";
import { createYHubVersioningEndpoints } from "../yhub.js";

const baseUrl = "https://yhub.test/api";
const first = { from: 1000, to: 1000, by: ["alice"] };
const latest = { from: 2000, to: 2000, by: ["bob"] };
const version = {
  type: "version:v1" as const,
  t: 1000,
  name: "Milestone",
  custom: { restoredFrom: 42, ticket: "BN-1" },
  updatedAt: 3000,
};

function response(body: unknown, status = 200) {
  return new Response(
    status === 204 ? null : (encodeAny(body) as BufferSource),
    {
      status,
    },
  );
}

function endpoints() {
  return createYHubVersioningEndpoints({
    baseUrl,
    org: "org",
    docId: "doc",
  })(BlockNoteEditor.create());
}

function request(spy: ReturnType<typeof vi.spyOn>, index: number) {
  const [url, init] = spy.mock.calls[index];
  return {
    url: new URL(url as string),
    method: init?.method ?? "GET",
    body: init?.body ? decodeAny(init.body) : undefined,
  };
}

describe("YHub versioning", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, "fetch");
  });
  afterEach(() => vi.restoreAllMocks());

  it("lists activity and embedded named versions in one request", async () => {
    fetchSpy.mockResolvedValueOnce(
      response({
        activity: [
          latest,
          {
            ...first,
            version,
            customAttributions: [{ k: "source", v: "import" }],
          },
        ],
      }),
    );
    const { current, snapshots } = await endpoints().list();
    expect(fetchSpy).toHaveBeenCalledOnce();
    expect(request(fetchSpy, 0).url.pathname).toBe("/api/activity/v1/org/doc");
    expect(request(fetchSpy, 0).url.searchParams.get("versions")).toBe("true");
    expect(current).toMatchObject({ id: "2000", by: ["bob"] });
    expect(snapshots).toEqual([
      {
        id: "1000",
        createdAt: 1000,
        by: ["alice"],
        name: "Milestone",
        restoredFrom: { id: "42", createdAt: 42 },
        metadata: version.custom,
        customAttributions: { source: "import" },
      },
    ]);
  });

  it("shows an empty named-version entry and merges duplicate timestamps", async () => {
    fetchSpy.mockResolvedValueOnce(
      response({
        activity: [
          latest,
          { from: 1000, to: 1000, by: [], version, isEmpty: true },
          { ...first, customAttributions: [{ k: "source", v: "edit" }] },
        ],
      }),
    );
    const { snapshots } = await endpoints().list();
    expect(snapshots).toHaveLength(1);
    expect(snapshots[0]).toMatchObject({
      name: "Milestone",
      by: ["alice"],
      metadata: version.custom,
      customAttributions: { source: "edit" },
    });
  });

  it("does not require a collaboration document to list or name versions", async () => {
    fetchSpy.mockResolvedValueOnce(response({ activity: [latest, first] }));
    const { snapshots } = await endpoints().list();
    expect(snapshots[0]?.name).toBeUndefined();
  });

  it("names the listed current with the native POST endpoint", async () => {
    const api = endpoints();
    fetchSpy.mockResolvedValueOnce(response({ activity: [latest, first] }));
    await api.list();
    fetchSpy.mockResolvedValueOnce(response({ versions: [] }));
    fetchSpy.mockResolvedValueOnce(
      response({ ...version, t: 2000, name: "Saved" }),
    );
    const named = await api.create!(new Y.Node(), { name: "Saved" });
    expect(named).toMatchObject({ id: "2000", name: "Saved" });
    expect(request(fetchSpy, 1).url.searchParams.get("from")).toBe("2000");
    expect(request(fetchSpy, 2)).toMatchObject({
      method: "POST",
      body: { type: "version:v1", t: 2000, name: "Saved" },
    });
  });

  it("does not write an unnamed version", async () => {
    fetchSpy.mockResolvedValueOnce(response({ activity: [latest] }));
    expect(await endpoints().create!(new Y.Node(), {})).toMatchObject({
      id: "2000",
    });
    expect(fetchSpy).toHaveBeenCalledOnce();
  });

  it("round-trips app metadata through POST and a subsequent listing", async () => {
    const api = endpoints();
    const metadata = { ticket: "BN-2", tags: ["review"], approved: false };
    const saved = { ...version, t: 2000, name: "Review", custom: metadata };
    fetchSpy.mockResolvedValueOnce(response({ activity: [latest] }));
    fetchSpy.mockResolvedValueOnce(response({ versions: [] }));
    fetchSpy.mockResolvedValueOnce(response(saved));
    const created = await api.create!(new Y.Node(), {
      name: "Review",
      metadata,
    });
    expect(request(fetchSpy, 2).body.custom).toEqual(metadata);
    expect(created.metadata).toEqual(metadata);

    fetchSpy.mockResolvedValueOnce(
      response({
        activity: [
          {
            ...latest,
            version: saved,
            customAttributions: [{ k: "ticket", v: "edit-ticket" }],
          },
        ],
      }),
    );
    const { current } = await api.list();
    expect(current.metadata).toEqual(metadata);
    expect(current.customAttributions).toEqual({ ticket: "edit-ticket" });
  });

  it("carries app types and data through the collaboration-installed extension", async () => {
    interface ReviewMetadata {
      ticket: string;
      approved: boolean;
    }
    const doc = new Y.Doc();
    const editor = BlockNoteEditor.create(
      withCollaboration({
        collaboration: {
          fragment: doc.get("bn"),
          user: { name: "Alice", color: "red" },
          versioningEndpoints: createYHubVersioningEndpoints({
            baseUrl,
            org: "org",
            docId: "doc",
          }),
        },
      }),
    );
    const extension = editor.getExtension(VersioningExtension)!;
    const metadata = { ticket: "BN-2", approved: true };
    const saved = { ...version, t: 2000, custom: metadata };
    fetchSpy.mockResolvedValueOnce(response({ activity: [latest] }));
    fetchSpy.mockResolvedValueOnce(response({ versions: [] }));
    fetchSpy.mockResolvedValueOnce(response(saved));
    // The command lists on first create; YHub may not yet show the saved version.
    fetchSpy.mockResolvedValueOnce(response({ activity: [latest] }));
    const created = await extension.create!<ReviewMetadata>({
      name: "Review",
      metadata,
    });
    const createReview = extension.create!<ReviewMetadata>;
    expectTypeOf<Parameters<typeof createReview>[0]>().toEqualTypeOf<
      VersionCreateOptions<ReviewMetadata> | undefined
    >();
    expectTypeOf(created).toEqualTypeOf<VersionSnapshot<ReviewMetadata>>();
    expect(extension.getSnapshot(created)?.metadata).toEqual(metadata);
    fetchSpy.mockResolvedValueOnce(
      response({ activity: [{ ...latest, version: saved }, first] }),
    );
    const listed = await extension.list<ReviewMetadata>();
    expectTypeOf(listed.current.metadata).toEqualTypeOf<
      ReviewMetadata | null | undefined
    >();
    expectTypeOf(listed.snapshots[0].metadata).toEqualTypeOf<
      ReviewMetadata | null | undefined
    >();
    expect(listed.current.metadata).toEqual(metadata);
    expect(
      extension.getSnapshot<ReviewMetadata>("2000")?.metadata?.ticket,
    ).toBe("BN-2");
    expect(editor.getExtension(VersioningExtension)).toBe(extension);
  });

  it("replaces custom data with conditional PATCH, without changing an omitted name", async () => {
    const metadata = ["app", { nested: true }];
    fetchSpy.mockResolvedValueOnce(
      response({ activity: [{ ...first, version }] }),
    );
    fetchSpy.mockResolvedValueOnce(response({ versions: [version] }));
    fetchSpy.mockResolvedValueOnce(response({ ...version, custom: metadata }));
    const created = await endpoints().create!(new Y.Node(), { metadata });
    expect(request(fetchSpy, 2)).toMatchObject({
      method: "PATCH",
      body: {
        updatedAt: version.updatedAt,
        name: version.name,
        custom: metadata,
      },
    });
    expect(created).toMatchObject({ name: version.name, metadata });
    expect(created.restoredFrom).toBeUndefined();
  });

  it("preserves custom data when naming without metadata and returns the server value", async () => {
    fetchSpy.mockResolvedValueOnce(response({ activity: [first] }));
    fetchSpy.mockResolvedValueOnce(response({ versions: [version] }));
    fetchSpy.mockResolvedValueOnce(response({ ...version, name: "New" }));
    const created = await endpoints().create!(new Y.Node(), { name: "New" });
    expect(request(fetchSpy, 2).body.custom).toEqual(version.custom);
    expect(created.metadata).toEqual(version.custom);
  });

  it.each([false, 0, "", [], {}, null].map((metadata) => ({ metadata })))(
    "persists metadata-only saves including $metadata",
    async ({ metadata }) => {
      fetchSpy.mockResolvedValueOnce(response({ activity: [latest] }));
      fetchSpy.mockResolvedValueOnce(response({ versions: [] }));
      fetchSpy.mockResolvedValueOnce(
        response({ ...version, t: 2000, name: "", custom: metadata }),
      );
      const created = await endpoints().create!(new Y.Node(), { metadata });
      expect(request(fetchSpy, 2).body).toEqual({
        type: "version:v1",
        t: 2000,
        name: "",
        custom: metadata,
      });
      expect(created.metadata).toEqual(metadata);
      expect(created.name).toBeUndefined();
    },
  );

  it.each([false, 0, "", ["app"], {}, null].map((custom) => ({ custom })))(
    "keeps non-object and empty custom values across duplicate activity rows: $custom",
    async ({ custom }) => {
      fetchSpy.mockResolvedValueOnce(
        response({
          activity: [
            { ...first, version: { ...version, custom } },
            { ...first, customAttributions: [{ k: "source", v: "edit" }] },
          ],
        }),
      );
      const { current } = await endpoints().list();
      expect(current.metadata).toEqual(custom);
      expect(current.customAttributions).toEqual({ source: "edit" });
    },
  );

  it("renames with conditional PATCH preserving custom data", async () => {
    fetchSpy.mockResolvedValueOnce(response({ versions: [version] }));
    fetchSpy.mockResolvedValueOnce(
      response({ ...version, name: "New", updatedAt: 3001 }),
    );
    await endpoints().rename!({ id: "1000", createdAt: 1000 }, "New");
    expect(request(fetchSpy, 1)).toMatchObject({
      method: "PATCH",
      body: {
        type: "version:v1",
        t: 1000,
        updatedAt: 3000,
        name: "New",
        custom: version.custom,
      },
    });
  });

  it("clears a named version's name while keeping custom data", async () => {
    fetchSpy.mockResolvedValueOnce(response({ versions: [version] }));
    fetchSpy.mockResolvedValueOnce(response({ ...version, name: "" }));
    await endpoints().remove!({ id: "1000", createdAt: 1000 });
    expect(request(fetchSpy, 1).body).toMatchObject({
      name: "",
      custom: version.custom,
    });
  });

  it("deletes a version without custom data using the conditional timestamp", async () => {
    fetchSpy.mockResolvedValueOnce(
      response({ versions: [{ ...version, custom: null }] }),
    );
    fetchSpy.mockResolvedValueOnce(response(null, 204));
    await endpoints().remove!({ id: "1000", createdAt: 1000 });
    expect(request(fetchSpy, 1).method).toBe("DELETE");
    expect(request(fetchSpy, 1).url.searchParams.get("updatedAt")).toBe("3000");
  });

  it("leaves an automatic entry alone when there is no named version", async () => {
    fetchSpy.mockResolvedValueOnce(response({ versions: [] }));
    await endpoints().remove!({ id: "1000", createdAt: 1000 });
    expect(fetchSpy).toHaveBeenCalledOnce();
  });

  it("propagates version conflicts rather than overwriting concurrent changes", async () => {
    fetchSpy.mockResolvedValueOnce(response({ versions: [version] }));
    fetchSpy.mockResolvedValueOnce(response({ error: "conflict" }, 409));
    await expect(
      endpoints().rename!({ id: "1000", createdAt: 1000 }, "New"),
    ).rejects.toThrow("409");
  });

  it("fetches historical content by timestamp", async () => {
    const doc = new Y.Doc();
    doc.get("default").push(["hello"]);
    fetchSpy.mockResolvedValueOnce(
      response({ ydoc: Y.encodeStateAsUpdate(doc) }),
    );
    expect(
      await endpoints().getContent({ id: "1000", createdAt: 1000 }),
    ).toBeInstanceOf(Uint8Array);
    expect(request(fetchSpy, 0).url.searchParams.get("to")).toBe("1000");
  });

  it("fetches attributions between snapshots without a version lookup", async () => {
    fetchSpy.mockResolvedValueOnce(
      response({ attributions: Y.encodeContentMap(Y.createContentMap()) }),
    );
    await endpoints().getAttributions!(
      { kind: "snapshot", snapshot: { id: "2000", createdAt: 2000 } },
      { id: "1000", createdAt: 1000 },
    );
    const url = request(fetchSpy, 0).url;
    expect(url.pathname).toBe("/api/changeset/v1/org/doc");
    expect(url.searchParams.get("from")).toBe("1000");
    expect(url.searchParams.get("to")).toBe("2000");
  });

  it("pins the pre-restore head on YHub before rolling back the selected fragment", async () => {
    const doc = new Y.Doc();
    const fragment = doc.get("default");
    fragment.push(["hello"]);
    const api = endpoints();
    fetchSpy.mockImplementation(async (url: string, init?: RequestInit) => {
      const path = new URL(url).pathname;
      if (path.includes("/changeset/")) {
        return response({ ydoc: Y.encodeStateAsUpdate(doc) });
      }
      if (path.includes("/activity/")) {
        return response({ activity: [latest] });
      }
      if (path.includes("/ydoc/")) {
        return response({ doc: Y.encodeStateAsUpdate(doc) });
      }
      if (path.includes("/version/") && init?.method !== "POST") {
        return response({ versions: [] });
      }
      if (path.includes("/version/")) {
        return response({ ...version, t: 2000 });
      }
      return response({ success: true });
    });

    await api.restore!(fragment, { id: "1000", createdAt: 1000 });
    const calls = Array.from(
      { length: fetchSpy.mock.calls.length },
      (_, index) => request(fetchSpy, index),
    );
    expect(
      calls.find(
        (call) =>
          call.method === "POST" && call.url.pathname.includes("/version/"),
      )?.body,
    ).toMatchObject({
      t: 2000,
      name: "Before restore",
    });
    expect(calls.at(-1)?.url.pathname).toBe("/api/rollback/v1/org/doc");
    expect(calls.at(-1)?.body.from).toBe(1001);
    const ids = Y.decodeContentIds(calls.at(-1)?.body.contentIds);
    expect(ids.inserts).toBeDefined();
  });

  it("does not replace an already named pre-restore head", async () => {
    const doc = new Y.Doc();
    const fragment = doc.get("default");
    fragment.push(["hello"]);
    fetchSpy.mockImplementation(async (url: string) => {
      const path = new URL(url).pathname;
      if (path.includes("/changeset/")) {
        return response({ ydoc: Y.encodeStateAsUpdate(doc) });
      }
      if (path.includes("/activity/")) {
        return response({ activity: [latest] });
      }
      if (path.includes("/ydoc/")) {
        return response({ doc: Y.encodeStateAsUpdate(doc) });
      }
      if (path.includes("/version/")) {
        return response({ versions: [{ ...version, t: 2000 }] });
      }
      return response({ success: true });
    });
    await endpoints().restore!(fragment, { id: "1000", createdAt: 1000 });
    expect(
      Array.from({ length: fetchSpy.mock.calls.length }, (_, index) =>
        request(fetchSpy, index),
      ).filter((call) => call.url.pathname.includes("/version/")),
    ).toHaveLength(1);
  });
});
