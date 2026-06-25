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
    attribution: { by: "alice" },
    changes: (editor) => {
      editor.insertBlocks(
        [{ type: "paragraph", content: "hello world" }],
        editor.document[0],
        "before",
      );
    },
  },
  {
    name: "More",
    attribution: { by: "bob" },
    changes: (editor) => {
      editor.insertBlocks(
        [{ type: "paragraph", content: "second block" }],
        editor.document[0],
        "after",
      );
    },
  },
];

type DecodedPatch = {
  update: Uint8Array;
  customAttributions: Array<{ k: string; v: string }>;
};

async function decodePatchBody(call: any): Promise<DecodedPatch> {
  const init = call[1] as RequestInit;
  const body = init.body as Uint8Array;
  return decodeAny(new Uint8Array(body)) as DecodedPatch;
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

  it("PATCHes a base update then one type:version marker per step", async () => {
    const editor = BlockNoteEditor.create();
    const build = await buildSnapshots(editor, steps, { fragment: "" });

    const versions = await seedYHubDocument(
      { baseUrl: BASE_URL, org: ORG, docId: DOC_ID },
      build,
    );

    // 1 base PATCH + 1 per step
    expect(fetchSpy).toHaveBeenCalledTimes(3);

    // All PATCHes hit the /ydoc/{org}/{docId} endpoint
    for (const call of fetchSpy.mock.calls) {
      expect(call[0]).toBe(`${BASE_URL}/ydoc/${ORG}/${DOC_ID}`);
      expect((call[1] as RequestInit).method).toBe("PATCH");
    }

    // First PATCH is the base content, with no version marker.
    const base = await decodePatchBody(fetchSpy.mock.calls[0]);
    expect(base.customAttributions).toEqual([]);
    expect(base.update.byteLength).toBeGreaterThan(0);

    // Each subsequent PATCH carries a type:version marker + name + author.
    const v1 = await decodePatchBody(fetchSpy.mock.calls[1]);
    expect(v1.customAttributions).toEqual([
      { k: "type", v: "version" },
      { k: "id", v: versions[0].id },
      { k: "name", v: "Intro" },
      { k: "by", v: "alice" },
    ]);

    const v2 = await decodePatchBody(fetchSpy.mock.calls[2]);
    expect(v2.customAttributions).toEqual([
      { k: "type", v: "version" },
      { k: "id", v: versions[1].id },
      { k: "name", v: "More" },
      { k: "by", v: "bob" },
    ]);

    // Returned markers line up with the steps.
    expect(versions.map((v) => v.name)).toEqual(["Intro", "More"]);
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
      attribution: { by: "Alice" },
      changes: (editor) => {
        editor.replaceBlocks(editor.document, [
          { type: "heading", props: { level: 1 }, content: "Team Sync Notes" },
          { type: "paragraph", content: "Quick notes from today's sync." },
        ]);
      },
    },
    {
      name: "Add agenda",
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
    {
      name: "Revise intro",
      attribution: { by: "Alice" },
      changes: (editor) => {
        editor.updateBlock(editor.document[1], {
          content: "Notes and action items from today's team sync.",
        });
      },
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
      // seedYHubDocument sends V1 updates.
      Y.applyUpdate(server, decoded.update);
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
      Y.applyUpdateV2(server, e.diff.update);
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
      Y.applyUpdateV2(local, e.diff.update);
    }

    const node = deltaToPNode(
      local.get("").toDeltaDeep(),
      serverEditor.pmSchema,
      null,
    );
    expect(docToBlocks(node).length).toBeGreaterThan(0);
  });
});
