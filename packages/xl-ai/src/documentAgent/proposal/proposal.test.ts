import { describe, expect, it } from "vite-plus/test";

import { hashDocument } from "./hash.js";
import {
  createProposal,
  forkPointOf,
  headlessEditorFactory,
  openProposal,
  replayProposal,
} from "./proposal.js";
import {
  initialDocument,
  textOf,
  valid,
  writeMarkdown as write,
} from "../testUtil.js";
import type { Proposal } from "./types.js";

const createEditor = headlessEditorFactory();

/** Writes a markdown text to the proposal, as one tool call. */
function writeMarkdown(proposal: Proposal, text: string, id: string): Proposal {
  return write(createEditor, proposal, text, id);
}

describe("proposal", () => {
  it("starts as the origin, without changes", () => {
    const proposal = createProposal(initialDocument());
    const { editor } = openProposal(createEditor, proposal);

    expect(editor.document).toEqual(initialDocument());
    expect(forkPointOf(proposal)).toEqual(initialDocument());
  });

  it("gives the same document and hash on another host", () => {
    const proposal = writeMarkdown(
      createProposal(initialDocument()),
      "# Title\n\nFirst paragraph, changed.\n\nA new paragraph.\n\nSecond paragraph.\n",
      "call-1",
    );
    const server = openProposal(createEditor, proposal).editor.document;

    // The client has only the JSON of the proposal.
    const received: Proposal = JSON.parse(JSON.stringify(proposal));
    const client = replayProposal(headlessEditorFactory(), received);

    expect(client.error).toBeUndefined();
    expect(valid(client).editor.document).toEqual(server);
    expect(hashDocument(server)).toBe(proposal.batches[0].hash);
  });

  it("lists the blocks that a batch changed, added and removed", () => {
    const proposal = writeMarkdown(
      createProposal(initialDocument()),
      "# Title\n\nFirst paragraph, changed.\n\nA new paragraph.\n",
      "call-1",
    );
    const [batch] = proposal.batches;
    const after = openProposal(createEditor, proposal).editor.document;
    const added = after.find((block) => !["title", "p1"].includes(block.id));

    expect(batch.changedBlockIds).toContain("p1");
    expect(batch.changedBlockIds).toContain("p2");
    expect(batch.changedBlockIds).toContain(added?.id);
    expect(batch.changedBlockIds).not.toContain("title");
  });

  it("keeps each version of the proposal document", () => {
    let proposal = createProposal(initialDocument());
    proposal = writeMarkdown(
      proposal,
      "# Title\n\nFirst paragraph, changed.\n\nSecond paragraph.\n",
      "call-1",
    );
    proposal = writeMarkdown(
      proposal,
      "# Title\n\nFirst paragraph, changed.\n\nSecond paragraph, changed.\n",
      "call-2",
    );

    const { versions } = openProposal(createEditor, proposal, [0, 1, 2]);

    expect(versions.get(0)).toEqual(initialDocument());
    expect(textOf(versions.get(1)?.[1])).toBe("First paragraph, changed.");
    expect(textOf(versions.get(1)?.[2])).toBe("Second paragraph.");
    expect(textOf(versions.get(2)?.[2])).toBe("Second paragraph, changed.");
  });

  it("detects a document that is different from the document of the batch", () => {
    const proposal = writeMarkdown(
      createProposal(initialDocument()),
      "# Title\n\nFirst paragraph, changed.\n\nSecond paragraph.\n",
      "call-1",
    );
    const other: Proposal = {
      ...proposal,
      origin: proposal.origin.map((block) =>
        block.id === "title" ? { ...block, id: "other-id" } : block,
      ),
    };

    expect(replayProposal(createEditor, other)).toEqual({
      error: "hash-mismatch",
      seq: 1,
    });
  });

  it("inserts a block of the schema fill with its ID, so that each host has the same document", () => {
    // A document without blocks gets one empty paragraph. Each editor gives
    // that paragraph its own ID.
    const proposal = writeMarkdown(
      createProposal(initialDocument()),
      "",
      "call-1",
    );
    const server = openProposal(createEditor, proposal).editor.document;

    expect(server).toHaveLength(1);
    expect(proposal.batches[0].operations).toContainEqual(
      expect.objectContaining({
        type: "insert",
        block: expect.objectContaining({ id: server[0].id }),
      }),
    );
    const client = replayProposal(
      headlessEditorFactory(),
      JSON.parse(JSON.stringify(proposal)),
    );
    expect(valid(client).editor.document).toEqual(server);
  });
});
