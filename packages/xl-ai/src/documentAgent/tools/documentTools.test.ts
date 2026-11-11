import { describe, expect, it } from "vite-plus/test";

import {
  createProposal,
  headlessEditorFactory,
  openProposal,
} from "../proposal/proposal.js";
import { toolCallsOf } from "../proposal/derive.js";
import type { Proposal } from "../proposal/types.js";
import { createInMemoryDocumentStore } from "../stores/documentSource.js";
import { createInMemoryProposalStore } from "../stores/proposalStore.js";
import { documentOf, initialDocument, textsOf, valid } from "../testUtil.js";
import { describeRead, describeWrite } from "./describe.js";
import {
  editText,
  readDocument,
  replaceRange,
  writeDocument,
} from "./documentTools.js";
import { createDocumentHandle } from "./handle.js";

const createEditor = headlessEditorFactory();

/** A handle on a new proposal of the test document, as for a run that a user starts. */
async function setup() {
  const store = createInMemoryProposalStore();
  await store.save("p", createProposal(initialDocument()));
  const handle = createDocumentHandle({ store, proposalId: "p", createEditor });
  async function proposal(): Promise<Proposal> {
    return (await store.load("p"))!;
  }
  async function texts() {
    return textsOf(
      openProposal(createEditor, await proposal()).editor.document,
    );
  }
  return { handle, proposal, texts };
}

describe("readDocument", () => {
  it("gives the markdown and the version", async () => {
    const { handle } = await setup();

    expect(await readDocument(handle)).toEqual({
      markdown: "# Title\n\nFirst paragraph.\n\nSecond paragraph.\n",
      version: "v0",
      notes: [],
      batches: [],
    });
  });
});

describe("replaceRange", () => {
  it("replaces the text from the first words to the last words, without the old text between them", async () => {
    const { handle, proposal, texts } = await setup();

    const output = valid(
      await replaceRange(
        handle,
        {
          from: "First",
          to: "paragraph.\n\nSecond paragraph.",
          new: "One new paragraph.",
          reason: "Two paragraphs become one.",
        },
        "call-1",
      ),
    );

    expect(output).toMatchObject({ version: "v1", changed: true, notes: [] });
    expect(output.batches[0].source).toEqual({
      type: "tool-call",
      toolCallId: "call-1",
      reason: "Two paragraphs become one.",
    });
    expect(await texts()).toEqual(["Title", "One new paragraph."]);
    expect((await proposal()).batches).toEqual(output.batches);
  });

  it("keeps the block and its ID for a change of one full paragraph", async () => {
    const { handle, proposal, texts } = await setup();

    const output = valid(
      await replaceRange(
        handle,
        {
          from: "Second",
          to: "paragraph.",
          new: "The last paragraph, with new text.",
          reason: "r",
        },
        "call-1",
      ),
    );

    expect(output.batches[0].operations).toMatchObject([
      { type: "update", id: "p2" },
    ]);
    expect(await texts()).toEqual([
      "Title",
      "First paragraph.",
      "The last paragraph, with new text.",
    ]);
    expect((await proposal()).batches).toHaveLength(1);
  });

  it("gives an error value for first words that are not in the document one time", async () => {
    const { handle, proposal } = await setup();

    expect(
      await replaceRange(
        handle,
        { from: "Third", to: "paragraph.", new: "x", reason: "r" },
        "call-1",
      ),
    ).toEqual({ error: "not-found", field: "from", batches: [] });
    expect(
      await replaceRange(
        handle,
        { from: "paragraph", to: ".", new: "x", reason: "r" },
        "call-2",
      ),
    ).toEqual({ error: "not-unique", field: "from", count: 2, batches: [] });
    expect((await proposal()).batches).toEqual([]);
  });

  it("gives an error value for last words that are not after the first words one time", async () => {
    const { handle, proposal } = await setup();

    // "Title" is in the document, but not after "First".
    const before = await replaceRange(
      handle,
      { from: "First", to: "Title", new: "x", reason: "r" },
      "call-1",
    );
    // "paragraph." is two times after "First": the range is not clear.
    const twice = await replaceRange(
      handle,
      { from: "First", to: "paragraph.", new: "x", reason: "r" },
      "call-2",
    );

    expect(before).toEqual({ error: "not-found", field: "to", batches: [] });
    expect(twice).toEqual({
      error: "not-unique",
      field: "to",
      count: 2,
      batches: [],
    });
    expect(describeWrite(twice)).toBe(
      "Not unique: nothing was written. The markdown of the document contains `to` 2 times after `from`. Add more of the text around it to `to`.",
    );
    expect((await proposal()).batches).toEqual([]);
  });

  it("gives an error value for an input without a field", async () => {
    const { handle } = await setup();

    expect(
      await replaceRange(
        handle,
        { from: "First", new: "x", reason: "r" } as never,
        "call-1",
      ),
    ).toEqual({ error: "invalid-input", field: "to", batches: [] });
  });
});

describe("editText", () => {
  it("replaces one text, and gives the batch of the call", async () => {
    const { handle, proposal, texts } = await setup();

    const output = valid(
      await editText(
        handle,
        { old: "First", new: "Opening", reason: "A better word." },
        "call-1",
      ),
    );

    expect(output).toMatchObject({ version: "v1", changed: true, notes: [] });
    expect(output.batches).toHaveLength(1);
    expect(output.batches[0]).toMatchObject({
      seq: 1,
      source: {
        type: "tool-call",
        toolCallId: "call-1",
        reason: "A better word.",
      },
      operations: [{ type: "update", id: "p1" }],
      changedBlockIds: ["p1"],
    });
    expect(await texts()).toEqual([
      "Title",
      "Opening paragraph.",
      "Second paragraph.",
    ]);
    expect((await proposal()).batches).toEqual(output.batches);
  });

  it("gives an error value for a text that is not in the document", async () => {
    const { handle, proposal } = await setup();

    const output = await editText(
      handle,
      { old: "Third", new: "3rd", reason: "r" },
      "call-1",
    );

    expect(output).toEqual({ error: "not-found", field: "old", batches: [] });
    expect((await proposal()).batches).toEqual([]);
  });

  it("gives an error value for a text that is in the document more than one time", async () => {
    const { handle, proposal } = await setup();

    const output = await editText(
      handle,
      { old: "paragraph", new: "sentence", reason: "r" },
      "call-1",
    );

    expect(output).toEqual({
      error: "not-unique",
      field: "old",
      count: 2,
      batches: [],
    });
    expect((await proposal()).batches).toEqual([]);
  });

  it("uses `new` as plain text", async () => {
    const { handle, texts } = await setup();

    valid(
      await editText(
        handle,
        { old: "First", new: "$& costs $1", reason: "r" },
        "call-1",
      ),
    );

    expect((await texts())[1]).toBe("$& costs $1 paragraph.");
  });

  it("runs two calls of one step in sequence", async () => {
    const { handle, proposal, texts } = await setup();

    // The loop of the AI SDK can run the tool calls of one step together.
    await Promise.all([
      editText(handle, { old: "First", new: "1st", reason: "r1" }, "call-1"),
      editText(handle, { old: "Second", new: "2nd", reason: "r2" }, "call-2"),
    ]);

    expect(await texts()).toEqual([
      "Title",
      "1st paragraph.",
      "2nd paragraph.",
    ]);
    expect(toolCallsOf(await proposal()).map((call) => call.seq)).toEqual([
      1, 2,
    ]);
  });
});

describe("writeDocument", () => {
  it("writes the full document from the version that the agent read", async () => {
    const { handle, texts } = await setup();
    const { markdown, version } = await readDocument(handle);

    const output = valid(
      await writeDocument(
        handle,
        {
          markdown: markdown.replace("# Title", "# A new title"),
          base: version,
          reason: "A new title.",
        },
        "call-1",
      ),
    );

    expect(output).toMatchObject({ version: "v1", changed: true });
    expect(await texts()).toEqual([
      "A new title",
      "First paragraph.",
      "Second paragraph.",
    ]);
  });

  it("gives no batch for a text without changes", async () => {
    const { handle, proposal } = await setup();
    const { markdown, version } = await readDocument(handle);

    const output = await writeDocument(
      handle,
      { markdown, base: version, reason: "r" },
      "call-1",
    );

    expect(output).toEqual({
      version: "v0",
      changed: false,
      notes: [],
      batches: [],
    });
    expect((await proposal()).batches).toEqual([]);
  });

  it("merges a write from an older version with a later edit of the agent", async () => {
    const { handle, texts } = await setup();
    const { markdown, version } = await readDocument(handle);
    await editText(
      handle,
      { old: "Second", new: "2nd", reason: "r" },
      "call-1",
    );

    // The markdown is from v0: it does not have the edit of call 1.
    valid(
      await writeDocument(
        handle,
        {
          markdown: markdown.replace("First", "1st"),
          base: version,
          reason: "r",
        },
        "call-2",
      ),
    );

    expect(await texts()).toEqual([
      "Title",
      "1st paragraph.",
      "2nd paragraph.",
    ]);
  });

  it("rejects a write from an older version that is in conflict with a later change", async () => {
    const { handle, proposal, texts } = await setup();
    const { markdown, version } = await readDocument(handle);
    await editText(
      handle,
      { old: "First", new: "Opening", reason: "r" },
      "call-1",
    );

    const output = await writeDocument(
      handle,
      {
        markdown: markdown.replace("First", "Initial"),
        base: version,
        reason: "r",
      },
      "call-2",
    );

    expect(output).toEqual({
      error: "conflict",
      conflicts: [
        {
          type: "warning",
          warning: { type: "conflicting-change", id: "p1" },
          text: "Opening paragraph.",
        },
      ],
      batches: [],
    });
    expect((await proposal()).batches).toHaveLength(1);
    expect((await texts())[1]).toBe("Opening paragraph.");
  });

  it("gives an error value for a version that the document does not have", async () => {
    const { handle } = await setup();

    expect(
      await writeDocument(
        handle,
        { markdown: "# Title\n", base: "v7", reason: "r" },
        "call-1",
      ),
    ).toEqual({ error: "unknown-version", batches: [] });
  });
});

describe("an input that does not agree with the schema of the tool", () => {
  it("gives an error value, thus the model can correct its call", async () => {
    const { handle, proposal } = await setup();

    // A model can leave out a field. The types do not allow it.
    const output = await editText(
      handle,
      { old: "First", reason: "r" } as Parameters<typeof editText>[1],
      "call-1",
    );

    expect(output).toEqual({
      error: "invalid-input",
      field: "new",
      batches: [],
    });
    expect(describeWrite(output)).toContain(
      "`new` of the tool call must be a string",
    );
    expect((await proposal()).batches).toEqual([]);
  });
});

describe("a handle that can read the main document", () => {
  /** A handle of a run that a server starts: each step rebases onto the main document. */
  async function setupWithMain() {
    const documents = createInMemoryDocumentStore();
    documents.write("doc", initialDocument());
    const store = createInMemoryProposalStore();
    await store.save("p", createProposal(initialDocument()));
    const handle = createDocumentHandle({
      store,
      proposalId: "p",
      createEditor,
      readMain: () => documents.read("doc"),
    });
    async function texts() {
      const proposal = (await store.load("p"))!;
      return textsOf(openProposal(createEditor, proposal).editor.document);
    }
    return { documents, handle, texts };
  }

  it("shows the agent a change of a user in the next read", async () => {
    const { documents, handle } = await setupWithMain();
    await readDocument(handle);
    documents.write(
      "doc",
      documentOf([
        { id: "title", type: "heading", content: "Title of the user" },
        { id: "p1", type: "paragraph", content: "First paragraph." },
        { id: "p2", type: "paragraph", content: "Second paragraph." },
      ]),
    );

    const output = await readDocument(handle);

    expect(output.markdown).toContain("# Title of the user");
    expect(output.version).toBe("v1");
    expect(output.notes).toEqual([{ type: "main-changed" }]);
    expect(output.batches.map((batch) => batch.source.type)).toEqual([
      "rebase",
    ]);
  });

  it("keeps a change of a user that is not in conflict with a write of the agent", async () => {
    const { documents, handle, texts } = await setupWithMain();
    const { markdown, version } = await readDocument(handle);
    // A user changes the title between the read and the write of the agent.
    documents.write(
      "doc",
      documentOf([
        { id: "title", type: "heading", content: "Title of the user" },
        { id: "p1", type: "paragraph", content: "First paragraph." },
        { id: "p2", type: "paragraph", content: "Second paragraph." },
      ]),
    );

    const output = valid(
      await writeDocument(
        handle,
        {
          markdown: markdown.replace("Second", "2nd"),
          base: version,
          reason: "r",
        },
        "call-1",
      ),
    );

    expect(output.notes).toEqual([{ type: "main-changed" }]);
    expect(output.batches.map((batch) => batch.source.type)).toEqual([
      "rebase",
      "tool-call",
    ]);
    expect(await texts()).toEqual([
      "Title of the user",
      "First paragraph.",
      "2nd paragraph.",
    ]);
  });

  it("rejects a write that is in conflict with a change of a user, and the agent reads again", async () => {
    const { documents, handle, texts } = await setupWithMain();
    const { markdown, version } = await readDocument(handle);
    documents.write(
      "doc",
      documentOf([
        { id: "title", type: "heading", content: "Title" },
        { id: "p1", type: "paragraph", content: "Paragraph one, by the user." },
        { id: "p2", type: "paragraph", content: "Second paragraph." },
      ]),
    );

    const conflict = await writeDocument(
      handle,
      {
        markdown: markdown.replace("First paragraph.", "The first paragraph."),
        base: version,
        reason: "r",
      },
      "call-1",
    );

    expect(conflict.error).toBe("conflict");
    expect(describeWrite(conflict)).toContain("Call readDocument");
    // The rebase applied: the proposal has the change of the user.
    expect((await texts())[1]).toBe("Paragraph one, by the user.");

    // The agent reads again, and writes on the new text.
    const again = await readDocument(handle);
    const output = valid(
      await writeDocument(
        handle,
        {
          markdown: again.markdown.replace(
            "by the user",
            "by the user and the agent",
          ),
          base: again.version,
          reason: "r",
        },
        "call-2",
      ),
    );
    expect(output.changed).toBe(true);
    expect((await texts())[1]).toBe(
      "Paragraph one, by the user and the agent.",
    );
  });

  it("tells the agent that a change of a user replaced its earlier change", async () => {
    const { documents, handle } = await setupWithMain();
    await editText(
      handle,
      { old: "First", new: "Opening", reason: "r" },
      "call-1",
    );
    documents.write(
      "doc",
      documentOf([
        { id: "title", type: "heading", content: "Title" },
        { id: "p1", type: "paragraph", content: "Paragraph one, by the user." },
        { id: "p2", type: "paragraph", content: "Second paragraph." },
      ]),
    );

    const output = await readDocument(handle);

    expect(output.notes).toEqual([
      { type: "main-changed" },
      {
        type: "dropped",
        warning: { type: "conflicting-change", id: "p1" },
        text: "Paragraph one, by the user.",
      },
    ]);
    expect(describeRead(output)).toContain(
      'one of your earlier changes did not stay (another writer changed the same part of a block, and that change stayed), at the block "Paragraph one, by the user."',
    );
  });
});

describe("the text for the model", () => {
  it("has the version and the markdown of a read, and no batches", async () => {
    const { handle } = await setup();

    expect(describeRead(await readDocument(handle))).toBe(
      "Version: v0\n---\n# Title\n\nFirst paragraph.\n\nSecond paragraph.\n",
    );
  });

  it("is one short line for a write", async () => {
    const { handle } = await setup();

    const output = await editText(
      handle,
      { old: "First", new: "Opening", reason: "r" },
      "call-1",
    );

    expect(describeWrite(output)).toBe("OK. The new version is v1.");
  });

  it("tells the agent what to do after an error", async () => {
    const { handle } = await setup();

    expect(
      describeWrite(
        await editText(handle, { old: "Third", new: "3rd", reason: "r" }, "c"),
      ),
    ).toContain("Not found");
    expect(
      describeWrite(
        await editText(
          handle,
          { old: "paragraph", new: "x", reason: "r" },
          "c",
        ),
      ),
    ).toContain("2 times");
  });
});
