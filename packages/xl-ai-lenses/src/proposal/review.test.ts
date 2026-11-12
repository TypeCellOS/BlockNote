import { describe, expect, it } from "vite-plus/test";

import { updateDocument } from "@blocknote/xl-ai/text-lens";
import {
  documentOf,
  initialDocument,
  textsOf,
  valid,
  writeMarkdown,
} from "../testUtil.js";
import { deriveSuggestions, toolCallsOf, toolCallsOfBlocks } from "./derive.js";
import {
  createProposal,
  forkPointOf,
  headlessEditorFactory,
  openProposal,
  withBatch,
} from "./proposal.js";
import { rebaseProposal } from "./rebase.js";
import { acceptAllChange, acceptToolCall, revertToolCall } from "./review.js";
import type { Proposal } from "./types.js";

const createEditor = headlessEditorFactory();

function write(proposal: Proposal, text: string, id: string): Proposal {
  return writeMarkdown(createEditor, proposal, text, id);
}

/** The proposal document. */
function documentOfProposal(proposal: Proposal) {
  return openProposal(createEditor, proposal).editor.document;
}

/** Two tool calls: the first changes the first paragraph, the second changes the second. */
function twoCalls(): Proposal {
  let proposal = createProposal(initialDocument());
  proposal = write(
    proposal,
    "# Title\n\nFirst paragraph, by call one.\n\nSecond paragraph.\n",
    "call-1",
  );
  return write(
    proposal,
    "# Title\n\nFirst paragraph, by call one.\n\nSecond paragraph, by call two.\n",
    "call-2",
  );
}

describe("accept all", () => {
  it("writes the proposal to the main document", () => {
    const proposal = twoCalls();
    const main = createEditor(initialDocument());

    valid(updateDocument(main, acceptAllChange(createEditor, proposal)));

    expect(main.document).toEqual(documentOfProposal(proposal));
  });

  it("keeps a change that a user made to the main document after the fork point", () => {
    const proposal = twoCalls();
    const main = createEditor(initialDocument());
    main.updateBlock("title", { content: "Title of the user" });

    valid(updateDocument(main, acceptAllChange(createEditor, proposal)));

    expect(textsOf(main.document)).toEqual([
      "Title of the user",
      "First paragraph, by call one.",
      "Second paragraph, by call two.",
    ]);
  });
});

describe("derived suggestions", () => {
  it("gives each operation the tool call that changed its block", () => {
    const proposal = twoCalls();
    const main = createEditor(initialDocument());

    const derived = deriveSuggestions(main, createEditor, proposal);

    expect(
      derived.operations.map((operation, index) => [
        operation.type,
        operation.type === "insert" ? operation.block.id : operation.id,
        derived.toolCallIds[index],
      ]),
    ).toEqual([
      ["update", "p1", "call-1"],
      ["update", "p2", "call-2"],
    ]);
    // The main document does not change.
    expect(main.document).toEqual(initialDocument());
  });

  it("does not show a change that the main document already has", () => {
    const proposal = twoCalls();
    const main = createEditor(initialDocument());
    main.updateBlock("p1", { content: "First paragraph, by call one." });

    const derived = deriveSuggestions(main, createEditor, proposal);

    expect(derived.operations.map((operation) => operation.type)).toEqual([
      "update",
    ]);
    expect(derived.toolCallIds).toEqual(["call-2"]);
  });
});

describe("reject one tool call", () => {
  it("reverts the changes of that call, and keeps the changes of a later call", () => {
    const proposal = twoCalls();

    const { batch } = valid(revertToolCall(createEditor, proposal, "call-1"));
    const next = withBatch(proposal, batch);

    expect(textsOf(documentOfProposal(next))).toEqual([
      "Title",
      "First paragraph.",
      "Second paragraph, by call two.",
    ]);
    expect(toolCallsOf(next).map((call) => call.state)).toEqual([
      "rejected",
      "open",
    ]);
    // The reject is a write to the proposal: the change does not come back.
    const main = createEditor(initialDocument());
    expect(deriveSuggestions(main, createEditor, next).toolCallIds).toEqual([
      "call-2",
    ]);
  });

  it("removes a block that the call added, and puts back a block that it removed", () => {
    let proposal = createProposal(initialDocument());
    proposal = write(
      proposal,
      "# Title\n\nA new paragraph.\n\nSecond paragraph.\n",
      "call-1",
    );

    const { batch } = valid(revertToolCall(createEditor, proposal, "call-1"));

    expect(documentOfProposal(withBatch(proposal, batch))).toEqual(
      initialDocument(),
    );
  });

  it("gives an error for a tool call that the proposal does not have", () => {
    expect(revertToolCall(createEditor, twoCalls(), "call-9")).toEqual({
      error: "unknown-tool-call",
    });
  });
});

describe("a block that two tool calls changed", () => {
  /** Call one changes the first word of the first paragraph, call two its last word. */
  function sharedBlock(): Proposal {
    let proposal = createProposal(initialDocument());
    proposal = write(
      proposal,
      "# Title\n\nOpening paragraph.\n\nSecond paragraph.\n",
      "call-1",
    );
    return write(
      proposal,
      "# Title\n\nOpening sentence.\n\nSecond paragraph.\n",
      "call-2",
    );
  }

  it("shows the block as one suggestion of the last call", () => {
    const proposal = sharedBlock();
    const main = createEditor(initialDocument());

    expect(toolCallsOfBlocks(proposal).get("p1")).toEqual(["call-1", "call-2"]);
    expect(deriveSuggestions(main, createEditor, proposal).toolCallIds).toEqual(
      ["call-2"],
    );
  });

  it("reverts only the words of the rejected call", () => {
    const proposal = sharedBlock();

    const first = valid(revertToolCall(createEditor, proposal, "call-1"));
    expect(
      textsOf(documentOfProposal(withBatch(proposal, first.batch))),
    ).toEqual(["Title", "First sentence.", "Second paragraph."]);

    const second = valid(revertToolCall(createEditor, proposal, "call-2"));
    expect(
      textsOf(documentOfProposal(withBatch(proposal, second.batch))),
    ).toEqual(["Title", "Opening paragraph.", "Second paragraph."]);
  });

  it.fails("KNOWN: a reject of the call that added a block keeps the block if a later call changed it", () => {
    // The revert of a call is a three-way merge that keeps the proposal on
    // a conflict. The removal of a block that a later call changed is such
    // a conflict. Thus the block stays. It also stays after a reject of the
    // later call: the user rejected the two calls, and the proposal still
    // has the new block, with the text of the first call.
    let proposal = createProposal(initialDocument());
    proposal = write(
      proposal,
      "# Title\n\nFirst paragraph.\n\nSecond paragraph.\n\nNew paragraph.\n",
      "call-1",
    );
    proposal = write(
      proposal,
      "# Title\n\nFirst paragraph.\n\nSecond paragraph.\n\nNew sentence.\n",
      "call-2",
    );

    for (const toolCallId of ["call-1", "call-2"]) {
      const { batch } = valid(
        revertToolCall(createEditor, proposal, toolCallId),
      );
      proposal = withBatch(proposal, batch);
    }

    // Now: also "New paragraph.".
    expect(textsOf(documentOfProposal(proposal))).toEqual([
      "Title",
      "First paragraph.",
      "Second paragraph.",
    ]);
  });

  it("accepts only the words of the accepted call", () => {
    const proposal = sharedBlock();
    const main = createEditor(initialDocument());

    const { change, batch } = valid(
      acceptToolCall(createEditor, proposal, "call-2"),
    );
    valid(updateDocument(main, change));

    expect(textsOf(main.document)).toEqual([
      "Title",
      "First sentence.",
      "Second paragraph.",
    ]);
    // The other call stays as a suggestion.
    const derived = deriveSuggestions(
      main,
      createEditor,
      withBatch(proposal, batch),
    );
    expect(derived.toolCallIds).toEqual(["call-1"]);
  });
});

describe("accept one tool call", () => {
  it("applies the changes of that call, and moves the fork point", () => {
    const proposal = twoCalls();
    const main = createEditor(initialDocument());

    const { change, batch } = valid(
      acceptToolCall(createEditor, proposal, "call-1"),
    );
    valid(updateDocument(main, change));
    const next = withBatch(proposal, batch);

    expect(textsOf(main.document)).toEqual([
      "Title",
      "First paragraph, by call one.",
      "Second paragraph.",
    ]);
    expect(forkPointOf(next)).toEqual(main.document);
    expect(toolCallsOf(next).map((call) => call.state)).toEqual([
      "accepted",
      "open",
    ]);
    expect(deriveSuggestions(main, createEditor, next).toolCallIds).toEqual([
      "call-2",
    ]);
  });

  it("does not add a block of the accepted call two times", () => {
    let proposal = createProposal(initialDocument());
    proposal = write(
      proposal,
      "# Title\n\nFirst paragraph.\n\nA new paragraph.\n\nSecond paragraph.\n",
      "call-1",
    );
    proposal = write(
      proposal,
      "# Title\n\nFirst paragraph.\n\nA new paragraph.\n\nSecond paragraph, by call two.\n",
      "call-2",
    );
    const main = createEditor(initialDocument());

    const { change, batch } = valid(
      acceptToolCall(createEditor, proposal, "call-1"),
    );
    valid(updateDocument(main, change));
    const next = withBatch(proposal, batch);
    valid(updateDocument(main, acceptAllChange(createEditor, next)));

    expect(textsOf(main.document)).toEqual([
      "Title",
      "First paragraph.",
      "A new paragraph.",
      "Second paragraph, by call two.",
    ]);
  });
});

/** Rebases, and returns the proposal with the batch of the rebase. */
function rebase(
  proposal: Proposal,
  main: Parameters<typeof rebaseProposal>[2],
) {
  const { batch, dropped } = rebaseProposal(createEditor, proposal, main);
  if (batch === undefined) {
    throw new Error("The rebase gave no batch");
  }
  return { next: withBatch(proposal, batch), dropped };
}

describe("rebase", () => {
  it("does nothing if the main document is the fork point", () => {
    expect(rebaseProposal(createEditor, twoCalls(), initialDocument())).toEqual(
      { batch: undefined, dropped: [] },
    );
  });

  it("takes the changes of the main document, and makes it the fork point", () => {
    const proposal = twoCalls();
    const main = documentOf([
      { id: "title", type: "heading", content: "Title of the user" },
      { id: "p1", type: "paragraph", content: "First paragraph." },
      { id: "p2", type: "paragraph", content: "Second paragraph." },
      { id: "p3", type: "paragraph", content: "A paragraph of the user." },
    ]);

    const { next, dropped } = rebase(proposal, main);

    expect(dropped).toEqual([]);
    expect(forkPointOf(next)).toEqual(main);
    expect(textsOf(documentOfProposal(next))).toEqual([
      "Title of the user",
      "First paragraph, by call one.",
      "Second paragraph, by call two.",
      "A paragraph of the user.",
    ]);
    // The block of the user keeps its ID in the proposal.
    expect(documentOfProposal(next)[3].id).toBe("p3");
    // The suggestions are still only the changes of the agent.
    const derived = deriveSuggestions(createEditor(main), createEditor, next);
    expect(derived.toolCallIds).toEqual(["call-1", "call-2"]);
  });

  it("reports a change of the agent that a change of a user replaced", () => {
    const proposal = twoCalls();
    const main = documentOf([
      { id: "title", type: "heading", content: "Title" },
      { id: "p1", type: "paragraph", content: "Paragraph one, by the user." },
      { id: "p2", type: "paragraph", content: "Second paragraph." },
    ]);

    const { next, dropped } = rebase(proposal, main);

    expect(dropped).toEqual([{ type: "conflicting-change", id: "p1" }]);
    expect(textsOf(documentOfProposal(next))).toEqual([
      "Title",
      "Paragraph one, by the user.",
      "Second paragraph, by call two.",
    ]);
  });

  it("reports a change of the agent to a block that a user removed", () => {
    const proposal = twoCalls();
    const main = documentOf([
      { id: "title", type: "heading", content: "Title" },
      { id: "p2", type: "paragraph", content: "Second paragraph." },
    ]);

    const { next, dropped } = rebase(proposal, main);

    expect(dropped).toEqual([{ type: "change-to-removed-block", id: "p1" }]);
    expect(textsOf(documentOfProposal(next))).toEqual([
      "Title",
      "Second paragraph, by call two.",
    ]);
  });
});
