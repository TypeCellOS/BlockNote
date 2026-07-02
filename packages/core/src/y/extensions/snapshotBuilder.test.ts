import { describe, expect, it } from "vite-plus/test";
import { deltaToPNode } from "@y/prosemirror";
import * as Y from "@y/y";

import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { docToBlocks } from "../../index.js";
import {
  type SnapshotStep,
  buildSnapshots,
  diffSnapshots,
  snapshotToBlocks,
} from "./snapshotBuilder.js";

// Block ids are deterministic per-test: vitestSetup resets the UniqueID
// counter (`window.__TEST_OPTIONS`) in `beforeEach`, so every test that
// generates ids starts again from "0".

describe("snapshotBuilder: yjs snapshots at points in time", () => {
  const steps: SnapshotStep[] = [
    {
      name: "snapshot 1",
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
      name: "snapshot 2",
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
    {
      name: "snapshot 3",
      contributions: [
        {
          attribution: { by: "alice" },
          changes: (editor) => {
            // edit the first paragraph's text
            editor.updateBlock(editor.document[0], {
              content: "hello there",
            });
          },
        },
      ],
    },
  ];

  it("reconstructs the full BlockNote JSON at each snapshot", async () => {
    const editor = BlockNoteEditor.create();
    const result = await buildSnapshots(editor, steps);

    // snapshot 1: a single "hello world" paragraph (+ trailing empty paragraph)
    expect(snapshotToBlocks(result, result.snapshots[0].snapshot))
      .toMatchInlineSnapshot(`
      [
        {
          "children": [],
          "content": [
            {
              "styles": {},
              "text": "hello world",
              "type": "text",
            },
          ],
          "id": "1",
          "props": {
            "backgroundColor": "default",
            "textAlignment": "left",
            "textColor": "default",
          },
          "type": "paragraph",
        },
        {
          "children": [],
          "content": [],
          "id": "0",
          "props": {
            "backgroundColor": "default",
            "textAlignment": "left",
            "textColor": "default",
          },
          "type": "paragraph",
        },
      ]
    `);

    // snapshot 2: "second block" inserted after the first
    expect(snapshotToBlocks(result, result.snapshots[1].snapshot))
      .toMatchInlineSnapshot(`
      [
        {
          "children": [],
          "content": [
            {
              "styles": {},
              "text": "hello world",
              "type": "text",
            },
          ],
          "id": "1",
          "props": {
            "backgroundColor": "default",
            "textAlignment": "left",
            "textColor": "default",
          },
          "type": "paragraph",
        },
        {
          "children": [],
          "content": [
            {
              "styles": {},
              "text": "second block",
              "type": "text",
            },
          ],
          "id": "2",
          "props": {
            "backgroundColor": "default",
            "textAlignment": "left",
            "textColor": "default",
          },
          "type": "paragraph",
        },
        {
          "children": [],
          "content": [],
          "id": "0",
          "props": {
            "backgroundColor": "default",
            "textAlignment": "left",
            "textColor": "default",
          },
          "type": "paragraph",
        },
      ]
    `);

    // snapshot 3: first paragraph edited to "hello there"
    expect(snapshotToBlocks(result, result.snapshots[2].snapshot))
      .toMatchInlineSnapshot(`
      [
        {
          "children": [],
          "content": [
            {
              "styles": {},
              "text": "hello there",
              "type": "text",
            },
          ],
          "id": "1",
          "props": {
            "backgroundColor": "default",
            "textAlignment": "left",
            "textColor": "default",
          },
          "type": "paragraph",
        },
        {
          "children": [],
          "content": [
            {
              "styles": {},
              "text": "second block",
              "type": "text",
            },
          ],
          "id": "2",
          "props": {
            "backgroundColor": "default",
            "textAlignment": "left",
            "textColor": "default",
          },
          "type": "paragraph",
        },
        {
          "children": [],
          "content": [],
          "id": "0",
          "props": {
            "backgroundColor": "default",
            "textAlignment": "left",
            "textColor": "default",
          },
          "type": "paragraph",
        },
      ]
    `);
  });

  it("diffs two snapshots", async () => {
    const editor = BlockNoteEditor.create();
    const result = await buildSnapshots(editor, steps);

    const diff = diffSnapshots(
      result,
      result.snapshots[0].snapshot,
      result.snapshots[2].snapshot,
    );

    expect(diff.before.length).toBe(2); // hello world + trailing empty
    expect(diff.after.length).toBe(3); // hello there + second block + trailing empty
    // there is a real delta between the two points in time
    expect(diff.delta).toBeTruthy();
  });

  it("emits onSnapshot per step with attributed contributions and storable updates", async () => {
    const editor = BlockNoteEditor.create();

    const events: Array<{
      name: string;
      bys: unknown[];
      updates: Uint8Array[];
      afterTexts: string[];
    }> = [];

    const result = await buildSnapshots(editor, steps, {
      onSnapshot: ({ name, before, after, contributions }) => {
        events.push({
          name,
          bys: contributions.map((c) => c.attribution?.by),
          updates: contributions.map((c) => c.update),
          afterTexts: after.map((b) =>
            Array.isArray(b.content)
              ? b.content.map((c: any) => c.text ?? "").join("")
              : "",
          ),
        });
        // before/after are the block JSON either side of this step
        expect(Array.isArray(before)).toBe(true);
        // each contribution carries a ProseMirror delta for diff UIs
        expect(contributions.every((c) => c.delta)).toBeTruthy();
      },
    });

    // Callback ran once per step, in order, carrying each step's per-author
    // contributions (one author each here).
    expect(events.map((e) => [e.name, e.bys])).toEqual([
      ["snapshot 1", ["alice"]],
      ["snapshot 2", ["bob"]],
      ["snapshot 3", ["alice"]],
    ]);
    expect(events.every((e) => e.updates.every((u) => u.byteLength > 0))).toBe(
      true,
    );

    // A throwaway "server": apply the base update, then replay every
    // contribution's update in order. This reproduces the exact final document.
    const server = new Y.Doc({ gc: false });
    Y.applyUpdateV2(server, result.baseUpdate);
    for (const e of events) {
      for (const u of e.updates) {
        Y.applyUpdateV2(server, u);
      }
    }

    const serverType = server.get(result.fragment);
    const serverBlocks = docToBlocks(
      deltaToPNode(serverType.toDeltaDeep(), editor.pmSchema, null),
    );
    expect(serverBlocks).toEqual(
      snapshotToBlocks(result, result.snapshots[2].snapshot),
    );
    // last step's after-state text matches too
    expect(events[2].afterTexts).toEqual(["hello there", "second block", ""]);
  });

  it("attributes multiple users within a single version", async () => {
    const editor = BlockNoteEditor.create();

    // One version, two authors: alice adds a block, bob adds another.
    const multiAuthor: SnapshotStep[] = [
      {
        name: "shared version",
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

    const result = await buildSnapshots(editor, multiAuthor);

    // One version, but two attributed contributions inside it.
    expect(result.snapshots).toHaveLength(1);
    const contributions = result.snapshots[0].contributions;
    expect(contributions.map((c) => c.attribution?.by)).toEqual([
      "alice",
      "bob",
    ]);
    expect(contributions.every((c) => c.update.byteLength > 0)).toBe(true);

    // Replaying both contributions' updates reproduces the version's content.
    const server = new Y.Doc({ gc: false });
    Y.applyUpdateV2(server, result.baseUpdate);
    for (const c of contributions) {
      Y.applyUpdateV2(server, c.update);
    }
    const serverBlocks = docToBlocks(
      deltaToPNode(
        server.get(result.fragment).toDeltaDeep(),
        editor.pmSchema,
        null,
      ),
    );
    expect(serverBlocks).toEqual(
      snapshotToBlocks(result, result.snapshots[0].snapshot),
    );
  });

  it("drops no-op contributions (an author who changed nothing)", async () => {
    const editor = BlockNoteEditor.create();

    const result = await buildSnapshots(editor, [
      {
        name: "version",
        contributions: [
          {
            attribution: { by: "alice" },
            changes: (e) =>
              e.insertBlocks(
                [{ type: "paragraph", content: "real change" }],
                e.document[0],
                "before",
              ),
          },
          // carol does nothing — should not produce a contribution.
          { attribution: { by: "carol" }, changes: () => {} },
        ],
      },
    ]);

    expect(
      result.snapshots[0].contributions.map((c) => c.attribution?.by),
    ).toEqual(["alice"]);
  });
});
