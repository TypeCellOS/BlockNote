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
      name: "snapshot 2",
      attribution: { by: "bob" },
      changes: (editor) => {
        editor.insertBlocks(
          [{ type: "paragraph", content: "second block" }],
          editor.document[0],
          "after",
        );
      },
    },
    {
      name: "snapshot 3",
      attribution: { by: "alice" },
      changes: (editor) => {
        // edit the first paragraph's text
        editor.updateBlock(editor.document[0], {
          content: "hello there",
        });
      },
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

  it("emits onSnapshot per step with attribution and a storable diff", async () => {
    const editor = BlockNoteEditor.create();

    const events: Array<{
      name: string;
      by: unknown;
      update: Uint8Array;
      afterTexts: string[];
    }> = [];

    const result = await buildSnapshots(editor, steps, {
      onSnapshot: ({ name, attribution, before, after, diff }) => {
        events.push({
          name,
          by: attribution?.by,
          update: diff.update,
          afterTexts: after.map((b) =>
            Array.isArray(b.content)
              ? b.content.map((c: any) => c.text ?? "").join("")
              : "",
          ),
        });
        // before/after are the block JSON either side of this step
        expect(Array.isArray(before)).toBe(true);
        // the delta is the ProseMirror diff for inspection / diff UIs
        expect(diff.delta).toBeTruthy();
      },
    });

    // Callback ran once per step, in order, carrying each step's attribution.
    expect(events.map((e) => [e.name, e.by])).toEqual([
      ["snapshot 1", "alice"],
      ["snapshot 2", "bob"],
      ["snapshot 3", "alice"],
    ]);
    expect(events.every((e) => e.update.byteLength > 0)).toBe(true);

    // A throwaway "server": apply the base update, then replay each step's
    // update in order. This reproduces the exact final document.
    const server = new Y.Doc({ gc: false });
    Y.applyUpdateV2(server, result.baseUpdate);
    for (const e of events) {
      Y.applyUpdateV2(server, e.update);
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
});
