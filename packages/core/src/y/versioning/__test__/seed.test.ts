import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vite-plus/test";
import { decodeAny } from "lib0/buffer";
import { deltaToPNode, pmToFragment } from "@y/prosemirror";
import * as Y from "@y/y";

import { docToBlocks } from "../../../index.js";
import { BlockNoteEditor } from "../../../editor/BlockNoteEditor.js";
import {
  type SnapshotStep,
  buildSnapshots,
} from "../../extensions/snapshotBuilder.js";
import { seedYHubDocument } from "../seed.js";

const BASE_URL = "https://yhub.test";
const ORG = "test-org";
const DOC_ID = "test-doc";

const steps: SnapshotStep[] = [
  {
    name: "Intro",
    contributions: [
      {
        attribution: { by: "alice" },
        changes: (editor) => {
          editor.insertBlocks(
            [{ type: "paragraph", content: "hello world" }],
            editor.document[0],
            "before",
          );
        },
      },
    ],
  },
  {
    name: "More",
    contributions: [
      {
        attribution: { by: "bob" },
        changes: (editor) => {
          editor.insertBlocks(
            [{ type: "paragraph", content: "second block" }],
            editor.document[0],
            "after",
          );
        },
      },
    ],
  },
];

type DecodedSubPatch = {
  update: Uint8Array;
  by?: string;
  at?: number;
  customAttributions?: Array<{ k: string; v: string }>;
};

type DecodedPatch = {
  // Present on the base PATCH (single top-level update).
  update?: Uint8Array;
  by?: string;
  at?: number;
  customAttributions?: Array<{ k: string; v: string }>;
  // Present on per-version PATCHes (bulk authored content + marker).
  patches?: DecodedSubPatch[];
};

async function decodePatchBody(call: any): Promise<DecodedPatch> {
  const init = call[1] as RequestInit;
  const body = init.body as Uint8Array;
  return decodeAny(new Uint8Array(body)) as DecodedPatch;
}

/** Apply every update a PATCH body carries (base update and/or each sub-patch). */
function applyDecodedPatch(server: Y.Doc, decoded: DecodedPatch) {
  if (decoded.update) {
    Y.applyUpdate(server, decoded.update);
  }
  for (const p of decoded.patches ?? []) {
    Y.applyUpdate(server, p.update);
  }
}

describe("seedYHubDocument", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, "fetch");
    fetchSpy.mockResolvedValue(new Response(null, { status: 200 }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("PATCHes a base update then a per-version content+marker bundle", async () => {
    const editor = BlockNoteEditor.create();
    const build = await buildSnapshots(editor, steps, { fragment: "" });

    const versions = await seedYHubDocument(
      { baseUrl: BASE_URL, org: ORG, docId: DOC_ID },
      build,
    );

    // 1 base PATCH + 1 per version
    expect(fetchSpy).toHaveBeenCalledTimes(3);

    // All PATCHes hit the /ydoc/{org}/{docId} endpoint
    for (const call of fetchSpy.mock.calls) {
      expect(call[0]).toBe(`${BASE_URL}/ydoc/${ORG}/${DOC_ID}`);
      expect((call[1] as RequestInit).method).toBe("PATCH");
    }

    // First PATCH is the base content, with no version marker and no bundle.
    const base = await decodePatchBody(fetchSpy.mock.calls[0]);
    expect(base.customAttributions).toEqual([]);
    expect(base.patches).toBeUndefined();
    expect(base.update?.byteLength).toBeGreaterThan(0);

    // Each version PATCH is a `patches` bundle: one authored content patch (no
    // marker) followed by a final type:version marker patch (no author).
    const v1 = await decodePatchBody(fetchSpy.mock.calls[1]);
    expect(v1.patches).toHaveLength(2);
    const [v1content, v1marker] = v1.patches!;
    expect(v1content.by).toBe("alice");
    expect(v1content.customAttributions).toEqual([]);
    expect(v1content.update.byteLength).toBeGreaterThan(0);
    // The marker is attributed to every author of the version (here just one).
    expect(v1marker.by).toBe("alice");
    expect(v1marker.customAttributions).toEqual([
      { k: "type", v: "version" },
      { k: "id", v: versions[0].id },
      { k: "name", v: "Intro" },
    ]);

    const v2 = await decodePatchBody(fetchSpy.mock.calls[2]);
    const [v2content, v2marker] = v2.patches!;
    expect(v2content.by).toBe("bob");
    expect(v2marker.customAttributions).toEqual([
      { k: "type", v: "version" },
      { k: "id", v: versions[1].id },
      { k: "name", v: "More" },
    ]);

    // Returned markers line up with the steps.
    expect(versions.map((v) => v.name)).toEqual(["Intro", "More"]);

    // Every patch is stamped with a strictly increasing `at`, so the backfilled
    // history is deterministically ordered (content before its marker, versions
    // in order).
    const ats = [
      base.at!,
      ...v1.patches!.map((p) => p.at!),
      ...v2.patches!.map((p) => p.at!),
    ];
    expect(ats.every((a) => typeof a === "number")).toBe(true);
    expect(ats).toEqual([...ats].sort((a, b) => a - b));
    expect(new Set(ats).size).toBe(ats.length);
  });

  it("attributes multiple users within a single version", async () => {
    const multiAuthor: SnapshotStep[] = [
      {
        name: "Shared version",
        contributions: [
          {
            attribution: { by: "alice" },
            changes: (e) =>
              e.insertBlocks(
                [{ type: "paragraph", content: "by alice" }],
                e.document[0],
                "before",
              ),
          },
          {
            attribution: { by: "bob" },
            changes: (e) =>
              e.insertBlocks(
                [{ type: "paragraph", content: "by bob" }],
                e.document[0],
                "after",
              ),
          },
        ],
      },
    ];

    const editor = BlockNoteEditor.create();
    const build = await buildSnapshots(editor, multiAuthor, { fragment: "" });
    await seedYHubDocument(
      { baseUrl: BASE_URL, org: ORG, docId: DOC_ID },
      build,
    );

    // base PATCH + one version bundle.
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    const version = await decodePatchBody(fetchSpy.mock.calls[1]);

    // Two authored content patches (distinct users) + one marker patch.
    expect(version.patches).toHaveLength(3);
    const contentPatches = version.patches!.slice(0, -1);
    const marker = version.patches![version.patches!.length - 1];

    expect(contentPatches.map((p) => p.by)).toEqual(["alice", "bob"]);

    // The version marker is credited to the most recent contributor.
    expect(marker.by).toBe("bob");
    expect(marker.customAttributions).toContainEqual({
      k: "type",
      v: "version",
    });
  });

  it("throws if the server rejects a PATCH", async () => {
    fetchSpy.mockResolvedValue(
      new Response(null, { status: 500, statusText: "Server Error" }),
    );

    const editor = BlockNoteEditor.create();
    const build = await buildSnapshots(editor, steps, { fragment: "" });

    await expect(
      seedYHubDocument({ baseUrl: BASE_URL, org: ORG, docId: DOC_ID }, build),
    ).rejects.toThrow(/YHub seed request failed: 500/);
  });

  // The richer content (heading + bulletList + replaceBlocks) the example seeds.
  const richSteps: SnapshotStep[] = [
    {
      name: "Initial draft",
      contributions: [
        {
          attribution: { by: "Alice" },
          changes: (editor) => {
            editor.replaceBlocks(editor.document, [
              {
                type: "heading",
                props: { level: 1 },
                content: "Team Sync Notes",
              },
              { type: "paragraph", content: "Quick notes from today's sync." },
            ]);
          },
        },
      ],
    },
    {
      name: "Add agenda",
      contributions: [
        {
          attribution: { by: "Bob" },
          changes: (editor) => {
            editor.insertBlocks(
              [
                { type: "heading", props: { level: 2 }, content: "Agenda" },
                { type: "bulletListItem", content: "Roadmap review" },
                { type: "bulletListItem", content: "Open questions" },
              ],
              editor.document[editor.document.length - 1],
              "after",
            );
          },
        },
      ],
    },
    {
      name: "Revise intro",
      contributions: [
        {
          attribution: { by: "Alice" },
          changes: (editor) => {
            editor.updateBlock(editor.document[1], {
              content: "Notes and action items from today's team sync.",
            });
          },
        },
      ],
    },
  ];

  // Mirrors the live path: a real YHub server doc that the PATCHed (V1) updates
  // are applied to, in order, exactly as `seedYHubDocument` sends them. This is
  // what the editor would sync down, so reconstructing it via `deltaToPNode`
  // proves the seeded content is valid (the bug that surfaced live was an
  // *empty* fragment reconstructing to a null node).
  it("seeds content a live editor can reconstruct", async () => {
    const editor = BlockNoteEditor.create();
    const build = await buildSnapshots(editor, richSteps, { fragment: "" });

    // Stand-in YHub server: apply each PATCH's update to a real Y.Doc.
    const server = new Y.Doc();
    fetchSpy.mockImplementation(async (...args: any[]) => {
      const decoded = await decodePatchBody(args);
      // seedYHubDocument sends V1 updates, either as a base `update` or as a
      // bundle of authored content + marker `patches`.
      applyDecodedPatch(server, decoded);
      return new Response(null, { status: 200 });
    });

    await seedYHubDocument(
      { baseUrl: BASE_URL, org: ORG, docId: DOC_ID },
      build,
    );

    // Reconstruct the document from the server's accumulated state, the same way
    // the live editor does on sync — must not throw "failed to create node".
    const serverType = server.get("");
    const node = deltaToPNode(serverType.toDeltaDeep(), editor.pmSchema, null);
    const blocks = docToBlocks(node);

    const texts = blocks.map((b: any) =>
      Array.isArray(b.content)
        ? b.content.map((c: any) => c.text ?? "").join("")
        : "",
    );
    expect(texts).toEqual([
      "Team Sync Notes",
      "Notes and action items from today's team sync.",
      "Agenda",
      "Roadmap review",
      "Open questions",
    ]);

    // The reconstructed server document matches the final build snapshot.
    const lastSnapshot = build.snapshots[build.snapshots.length - 1].snapshot;
    expect(blocks).toEqual(
      docToBlocks(
        deltaToPNode(
          Y.createDocFromSnapshot(build.ydoc, lastSnapshot)
            .get("")
            .toDeltaDeep(),
          editor.pmSchema,
          null,
        ),
      ),
    );
  });

  // Reproduces the live failure: the editor writes its initial content (one
  // blockGroup) into the fresh local fragment, THEN the seeded content (another
  // blockGroup) syncs in from the server. Merging gives the fragment root two
  // blockGroups, which can't fill a `doc` (exactly one blockGroup) →
  // `deltaToPNode` throws "failed to create node: null". The fix (see the
  // versioning example) is to let the server's content sync into an empty doc
  // FIRST and create the editor afterwards, so it adopts that single blockGroup
  // instead of writing a competing one.
  it("merging seeded content into an editor-initialised doc throws (the live error)", async () => {
    // Server: seeded content in fragment "".
    const serverEditor = BlockNoteEditor.create();
    const build = await buildSnapshots(serverEditor, richSteps, {
      fragment: "",
    });
    const server = new Y.Doc();
    Y.applyUpdateV2(server, build.baseUpdate);
    for (const e of build.snapshots) {
      for (const c of e.contributions) {
        Y.applyUpdateV2(server, c.update);
      }
    }

    // Client: a fresh doc that the editor populated with its own initial
    // content before sync (simulated with pmToFragment of the empty doc).
    const clientEditor = BlockNoteEditor.create();
    const client = new Y.Doc();
    pmToFragment(clientEditor.prosemirrorState.doc, client.get(""));

    // Sync the server's seeded content into the client.
    Y.applyUpdate(client, Y.encodeStateAsUpdate(server));

    expect(() =>
      deltaToPNode(client.get("").toDeltaDeep(), clientEditor.pmSchema, null),
    ).toThrow(/failed to create node/);
  });

  // The principle behind the fix: a doc that holds ONLY the seeded content (no
  // competing editor-initial blockGroup) reconstructs cleanly into one doc.
  it("seeded content with no competing initial blockGroup reconstructs cleanly", async () => {
    const serverEditor = BlockNoteEditor.create();
    const build = await buildSnapshots(serverEditor, richSteps, {
      fragment: "",
    });

    // Local doc populated from the seed BEFORE any editor initial content.
    const local = new Y.Doc();
    Y.applyUpdateV2(local, build.baseUpdate);
    for (const e of build.snapshots) {
      for (const c of e.contributions) {
        Y.applyUpdateV2(local, c.update);
      }
    }

    const node = deltaToPNode(
      local.get("").toDeltaDeep(),
      serverEditor.pmSchema,
      null,
    );
    expect(docToBlocks(node).length).toBeGreaterThan(0);
  });
});
