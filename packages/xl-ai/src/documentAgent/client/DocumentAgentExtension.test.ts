import { BlockNoteEditor, type PartialBlock } from "@blocknote/core";
import { withCollaboration, yXmlFragmentToBlocks } from "@blocknote/core/yjs";
import type { ChatTransport, UIMessage } from "ai";
import { afterEach, describe, expect, it } from "vite-plus/test";
import * as Y from "yjs";

import { AIExtension } from "../../AIExtension.js";
import { createProposal, headlessEditorFactory } from "../proposal/proposal.js";
import { createSessionHost } from "../sessions/sessionHost.js";
import { createInMemoryDocumentStore } from "../stores/documentSource.js";
import { createInMemoryProposalStore } from "../stores/proposalStore.js";
import {
  initialDocument,
  lastToolResult,
  scriptedModel,
  type ScriptedStep,
  textsOf,
  versionIn,
  writeMarkdown,
} from "../testUtil.js";
import { DocumentAgentExtension } from "./DocumentAgentExtension.js";
import { assertNoSuggestions, hasSuggestions } from "./suggestions.js";
import { createInProcessTransport } from "./transport.js";

// jsdom has no layout: it does not have `scrollIntoView`, which the AI menu
// calls when it opens.
Element.prototype.scrollIntoView = function scrollIntoView() {
  // No scroll in jsdom.
};

// A mounted editor must be destroyed before jsdom goes away.
const mounted: BlockNoteEditor<any, any, any>[] = [];
afterEach(() => {
  while (mounted.length) {
    mounted.pop()?._tiptapEditor.destroy();
  }
});

type Script = Parameters<typeof scriptedModel>[0];

/** Two edits with different reasons: call-2 changes the first paragraph, call-3 the second. */
const twoEdits: Script = [
  { toolCalls: [{ toolName: "readDocument", input: {} }] },
  {
    toolCalls: [
      {
        toolName: "editText",
        input: { old: "First", new: "Opening", reason: "A better word." },
      },
    ],
  },
  {
    toolCalls: [
      {
        toolName: "editText",
        input: { old: "Second", new: "Closing", reason: "It is the end." },
      },
    ],
  },
  { text: "I changed two words." },
];

type ModelOptions = Parameters<typeof scriptedModel>[1];

function extensionsFor(script: Script, options?: ModelOptions) {
  return [
    AIExtension(),
    DocumentAgentExtension({
      // Client mode: the loop and the tools run here, with the mock model.
      transport: createInProcessTransport({
        model: scriptedModel(script, options).model,
      }),
    }),
  ];
}

function createEditor(script: Script, options?: ModelOptions) {
  const editor = BlockNoteEditor.create({
    initialContent: initialDocument(),
    trailingBlock: false,
    extensions: extensionsFor(script, options),
  });
  editor.mount(document.createElement("div"));
  mounted.push(editor);
  const agent = editor.getExtension(DocumentAgentExtension)!;
  return { editor, agent };
}

/** The suggestion marks of the editor: the type, the suggestion ID and the marked text. */
function suggestionsOf(editor: BlockNoteEditor<any, any, any>) {
  const found: [string, unknown, string][] = [];
  editor.prosemirrorState.doc.descendants((node) => {
    for (const mark of node.marks) {
      if (["insertion", "deletion", "modification"].includes(mark.type.name)) {
        found.push([mark.type.name, mark.attrs.id, node.textContent]);
      }
    }
    return true;
  });
  return found;
}

function reviewOf(agent: { store: { state: unknown } }) {
  const state = agent.store.state as {
    status: string;
    review?: {
      answer: string;
      toolCalls: { toolCallId: string; reason: string; state: string }[];
    };
  };
  return {
    status: state.status,
    answer: state.review?.answer,
    toolCalls: state.review?.toolCalls.map((call) => [
      call.toolCallId,
      call.reason,
      call.state,
    ]),
  };
}

describe("the document agent in an editor", () => {
  it("shows the changes of each tool call as suggestions with the batch number of that call", async () => {
    const { editor, agent } = createEditor(twoEdits);

    await agent.invoke("Improve the text.");

    expect(reviewOf(agent)).toEqual({
      status: "reviewing",
      answer: "I changed two words.",
      toolCalls: [
        ["call-2", "A better word.", "open"],
        ["call-3", "It is the end.", "open"],
      ],
    });
    expect(suggestionsOf(editor)).toEqual([
      ["deletion", 1, "First"],
      ["insertion", 1, "Opening"],
      ["deletion", 2, "Second"],
      ["insertion", 2, "Closing"],
    ]);
  });

  it("shows the change of a tool call while the model still writes the next call of the same step", async () => {
    // The model writes two tool calls in one LLM step. Before the second
    // call, it waits until the test has examined the editor.
    let examined: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      examined = resolve;
    });
    let atSecondCall: () => void = () => undefined;
    const secondCall = new Promise<void>((resolve) => {
      atSecondCall = resolve;
    });
    const { editor, agent } = createEditor(
      [
        {
          toolCalls: [
            {
              toolName: "editText",
              input: { old: "First", new: "Opening", reason: "A better word." },
            },
            {
              toolName: "editText",
              input: {
                old: "Second",
                new: "Closing",
                reason: "It is the end.",
              },
            },
          ],
        },
        { text: "I changed two words." },
      ],
      {
        beforeToolCall: (toolCallId) => {
          if (toolCallId !== "call-2") {
            return Promise.resolve();
          }
          atSecondCall();
          return gate;
        },
      },
    );

    const run = agent.invoke("Improve the text.");
    await secondCall;
    // The first tool call ends in its own time: wait for its suggestions.
    await expect
      .poll(() => suggestionsOf(editor))
      .toEqual([
        ["deletion", 1, "First"],
        ["insertion", 1, "Opening"],
      ]);
    expect(reviewOf(agent).status).toBe("running");
    examined();
    await run;

    expect(suggestionsOf(editor)).toEqual([
      ["deletion", 1, "First"],
      ["insertion", 1, "Opening"],
      ["deletion", 2, "Second"],
      ["insertion", 2, "Closing"],
    ]);
    expect(reviewOf(agent).status).toBe("reviewing");
  });

  it("accepts the full proposal as one edit, which one undo reverts", async () => {
    const { editor, agent } = createEditor(twoEdits);
    await agent.invoke("Improve the text.");

    agent.acceptAll();

    expect(agent.store.state).toEqual({ status: "idle" });
    expect(hasSuggestions(editor.prosemirrorState.doc)).toBe(false);
    expect(textsOf(editor.document)).toEqual([
      "Title",
      "Opening paragraph.",
      "Closing paragraph.",
    ]);
    editor.undo();
    expect(editor.document).toEqual(initialDocument());
  });

  it("rejects the full proposal, and the document does not change", async () => {
    const { editor, agent } = createEditor(twoEdits);
    await agent.invoke("Improve the text.");

    agent.rejectAll();

    expect(agent.store.state).toEqual({ status: "idle" });
    expect(hasSuggestions(editor.prosemirrorState.doc)).toBe(false);
    expect(editor.document).toEqual(initialDocument());
  });

  it("accepts one tool call, and keeps the suggestions of the other", async () => {
    const { editor, agent } = createEditor(twoEdits);
    await agent.invoke("Improve the text.");

    agent.acceptToolCall("call-2");

    expect(reviewOf(agent).toolCalls).toEqual([
      ["call-2", "A better word.", "accepted"],
      ["call-3", "It is the end.", "open"],
    ]);
    expect(suggestionsOf(editor)).toEqual([
      ["deletion", 2, "Second"],
      ["insertion", 2, "Closing"],
    ]);

    // The reject of the last open call ends the review.
    agent.rejectToolCall("call-3");

    expect(agent.store.state).toEqual({ status: "idle" });
    expect(textsOf(editor.document)).toEqual([
      "Title",
      "Opening paragraph.",
      "Second paragraph.",
    ]);
  });

  it("rejects one tool call, and keeps the suggestions of the other", async () => {
    const { editor, agent } = createEditor(twoEdits);
    await agent.invoke("Improve the text.");

    agent.rejectToolCall("call-2");

    expect(suggestionsOf(editor)).toEqual([
      ["deletion", 2, "Second"],
      ["insertion", 2, "Closing"],
    ]);

    agent.acceptAll();

    expect(textsOf(editor.document)).toEqual([
      "Title",
      "First paragraph.",
      "Closing paragraph.",
    ]);
  });

  it("shows added, removed and moved blocks as suggestions of their tool call", async () => {
    const steps: Script = [
      { toolCalls: [{ toolName: "readDocument", input: {} }] },
      (prompt): ScriptedStep => ({
        toolCalls: [
          {
            toolName: "writeDocument",
            input: {
              markdown: "# Title\n\nSecond paragraph.\n\nA new paragraph.\n",
              base: versionIn(lastToolResult(prompt)),
              reason: "A new structure.",
            },
          },
        ],
      }),
      { text: "Done." },
    ];
    const { editor, agent } = createEditor(steps);

    await agent.invoke("Change the structure.");

    const ids = new Set(suggestionsOf(editor).map(([, id]) => id));
    expect([...ids]).toEqual([1]);

    agent.acceptAll();
    expect(textsOf(editor.document)).toEqual([
      "Title",
      "Second paragraph.",
      "A new paragraph.",
    ]);
  });

  it("continues the proposal with a second prompt", async () => {
    const { editor, agent } = createEditor([
      ...twoEdits,
      {
        toolCalls: [
          {
            toolName: "editText",
            input: { old: "Title", new: "A new title", reason: "A new title." },
          },
        ],
      },
      { text: "I changed the title." },
    ]);
    await agent.invoke("Improve the text.");

    await agent.invoke("Also change the title.");

    expect(reviewOf(agent)).toMatchObject({
      status: "reviewing",
      answer: "I changed the title.",
    });
    expect(reviewOf(agent).toolCalls?.map(([id]) => id)).toEqual([
      "call-2",
      "call-3",
      "call-4",
    ]);
    agent.acceptAll();
    expect(textsOf(editor.document)).toEqual([
      "A new title",
      "Opening paragraph.",
      "Closing paragraph.",
    ]);
  });
});

describe("the document agent in an editor that is bound to a Y.Doc", () => {
  function createCollaborativeEditor(script: Script) {
    const doc = new Y.Doc();
    const fragment = doc.getXmlFragment("doc");
    const editor = BlockNoteEditor.create(
      withCollaboration({
        collaboration: {
          fragment,
          user: { name: "User", color: "#ff0000" },
          provider: undefined,
        },
        trailingBlock: false,
        extensions: extensionsFor(script),
      }),
    );
    editor.mount(document.createElement("div"));
    mounted.push(editor);
    editor.replaceBlocks(editor.document, initialDocument() as PartialBlock[]);
    return {
      editor,
      fragment,
      agent: editor.getExtension(DocumentAgentExtension)!,
    };
  }

  it("keeps the suggestion marks out of the shared document", async () => {
    const { editor, fragment, agent } = createCollaborativeEditor(twoEdits);

    await agent.invoke("Improve the text.");

    // The editor shows the suggestions, in a local fork.
    expect(suggestionsOf(editor).map(([, id]) => id)).toEqual([1, 1, 2, 2]);
    // The shared document has no suggestion mark and no change.
    const shared = fragment.toJSON();
    expect(shared).not.toContain("insertion");
    expect(shared).not.toContain("deletion");
    expect(shared).toContain("First paragraph.");

    agent.acceptAll();

    expect(fragment.toJSON()).toContain("Opening paragraph.");
    expect(fragment.toJSON()).toContain("Closing paragraph.");
    expect(fragment.toJSON()).not.toContain("insertion");
  });

  it.fails("KNOWN: two users who accept one proposal at the same time both write its text", () => {
    // The base scenario, without `acceptGuard`: each accept is a write of
    // one user to the shared document, at once. Two accepts of the same
    // proposal that cross on the network are two inserts of the same text,
    // and Yjs keeps the two. The fixes: one order for the accepts (the
    // option `acceptGuard`, see the next test), or an accept that is the
    // same Yjs change for each user (the shared items of the Yjs 14
    // suggestion layer, the target).
    function editorOn(doc: Y.Doc, name: string) {
      const editor = BlockNoteEditor.create(
        withCollaboration({
          collaboration: {
            fragment: doc.getXmlFragment("doc"),
            user: { name, color: "#ff0000" },
            provider: undefined,
          },
          trailingBlock: false,
          extensions: [AIExtension(), DocumentAgentExtension()],
        }),
      );
      editor.mount(document.createElement("div"));
      mounted.push(editor);
      return { editor, agent: editor.getExtension(DocumentAgentExtension)! };
    }
    const docA = new Y.Doc();
    const a = editorOn(docA, "A");
    a.editor.replaceBlocks(
      a.editor.document,
      initialDocument() as PartialBlock[],
    );
    const docB = new Y.Doc();
    Y.applyUpdate(docB, Y.encodeStateAsUpdate(docA));
    const b = editorOn(docB, "B");
    const proposal = writeMarkdown(
      headlessEditorFactory(),
      createProposal(a.editor.document),
      "# Title\n\nOpening paragraph.\n\nSecond paragraph.\n",
      "call-1",
    );

    // The two users review the same proposal, and accept before they sync.
    a.agent.openProposal(proposal);
    b.agent.openProposal(proposal);
    a.agent.acceptAll();
    b.agent.acceptAll();
    const updateA = Y.encodeStateAsUpdate(docA);
    Y.applyUpdate(docA, Y.encodeStateAsUpdate(docB));
    Y.applyUpdate(docB, updateA);

    // Now: "OpeningOpening paragraph." in the two editors.
    expect(textsOf(a.editor.document)).toEqual([
      "Title",
      "Opening paragraph.",
      "Second paragraph.",
    ]);
    expect(textsOf(b.editor.document)).toEqual(textsOf(a.editor.document));
  });

  it.fails("KNOWN: two users who accept a new block at the same time give the shared document one block ID two times", () => {
    // The same base scenario as the known failure above, for a new block.
    // Each accept inserts a block with the ID that the block has in the
    // proposal. After the sync, the shared document has that ID two times.
    // Each editor gives new IDs to the two blocks in its own view (the
    // UniqueID plugin). These IDs go to the shared document only with the
    // next change of that user: until then, the editors do not agree.
    function editorOn(doc: Y.Doc, name: string) {
      const editor = BlockNoteEditor.create(
        withCollaboration({
          collaboration: {
            fragment: doc.getXmlFragment("doc"),
            user: { name, color: "#ff0000" },
            provider: undefined,
          },
          trailingBlock: false,
          extensions: [AIExtension(), DocumentAgentExtension()],
        }),
      );
      editor.mount(document.createElement("div"));
      mounted.push(editor);
      return { editor, agent: editor.getExtension(DocumentAgentExtension)! };
    }
    const docA = new Y.Doc();
    const a = editorOn(docA, "A");
    a.editor.replaceBlocks(
      a.editor.document,
      initialDocument() as PartialBlock[],
    );
    const docB = new Y.Doc();
    Y.applyUpdate(docB, Y.encodeStateAsUpdate(docA));
    const b = editorOn(docB, "B");
    const proposal = writeMarkdown(
      headlessEditorFactory(),
      createProposal(a.editor.document),
      "# Title\n\nFirst paragraph.\n\nSecond paragraph.\n\nNew paragraph.\n",
      "call-1",
    );

    a.agent.openProposal(proposal);
    b.agent.openProposal(proposal);
    a.agent.acceptAll();
    b.agent.acceptAll();
    const updateA = Y.encodeStateAsUpdate(docA);
    Y.applyUpdate(docA, Y.encodeStateAsUpdate(docB));
    Y.applyUpdate(docB, updateA);

    // Now: "New paragraph." two times, with one ID in the shared document,
    // and with different IDs in the two editors.
    const shared = yXmlFragmentToBlocks(a.editor, docA.getXmlFragment("doc"));
    const sharedIds = shared.map((block) => block.id);
    expect({
      sharedIdsAreDifferent: new Set(sharedIds).size === sharedIds.length,
      idsOfA: a.editor.document.map((block) => block.id),
      idsOfB: b.editor.document.map((block) => block.id),
    }).toEqual({
      sharedIdsAreDifferent: true,
      idsOfA: sharedIds,
      idsOfB: sharedIds,
    });
  });

  it("gives the accept to one of two users if the app has an accept guard", async () => {
    // The same case as the known failure above, with `acceptGuard`: the
    // host gives the accept to the first claim.
    let closed = false;
    const refused: string[] = [];
    function editorOn(doc: Y.Doc, name: string) {
      const editor = BlockNoteEditor.create(
        withCollaboration({
          collaboration: {
            fragment: doc.getXmlFragment("doc"),
            user: { name, color: "#ff0000" },
            provider: undefined,
          },
          trailingBlock: false,
          extensions: [
            AIExtension(),
            DocumentAgentExtension({
              // What a host does: one claim for a proposal gets true.
              acceptGuard: async () => {
                const granted = !closed;
                closed = true;
                return granted;
              },
              onAcceptRefused: () => refused.push(name),
            }),
          ],
        }),
      );
      editor.mount(document.createElement("div"));
      mounted.push(editor);
      return { editor, agent: editor.getExtension(DocumentAgentExtension)! };
    }
    const docA = new Y.Doc();
    const a = editorOn(docA, "A");
    a.editor.replaceBlocks(
      a.editor.document,
      initialDocument() as PartialBlock[],
    );
    const docB = new Y.Doc();
    Y.applyUpdate(docB, Y.encodeStateAsUpdate(docA));
    const b = editorOn(docB, "B");
    const proposal = writeMarkdown(
      headlessEditorFactory(),
      createProposal(a.editor.document),
      "# Title\n\nOpening paragraph.\n\nSecond paragraph.\n",
      "call-1",
    );
    a.agent.openProposal(proposal);
    b.agent.openProposal(proposal);

    a.agent.acceptAll();
    b.agent.acceptAll();
    // The accept waits for the guard: nothing is written yet.
    expect(a.agent.store.state.status).toBe("reviewing");
    await expect.poll(() => refused).toEqual(["B"]);

    // A wrote the accept. B did not write: its app gets the session of the
    // host, and ends its review.
    expect(a.agent.store.state.status).toBe("idle");
    expect(b.agent.store.state.status).toBe("reviewing");
    b.agent.dismiss();
    const updateA = Y.encodeStateAsUpdate(docA);
    Y.applyUpdate(docA, Y.encodeStateAsUpdate(docB));
    Y.applyUpdate(docB, updateA);
    expect(textsOf(a.editor.document)).toEqual([
      "Title",
      "Opening paragraph.",
      "Second paragraph.",
    ]);
    expect(textsOf(b.editor.document)).toEqual(textsOf(a.editor.document));
  });

  it("keeps a change that another user made to the shared document during the review", async () => {
    const { editor, fragment, agent } = createCollaborativeEditor(twoEdits);
    await agent.invoke("Improve the text.");

    // Another client changes the title while this client reviews.
    const other = new Y.Doc();
    Y.applyUpdate(other, Y.encodeStateAsUpdate(fragment.doc!));
    const otherEditor = BlockNoteEditor.create(
      withCollaboration({
        collaboration: {
          fragment: other.getXmlFragment("doc"),
          user: { name: "Other", color: "#00ff00" },
          provider: undefined,
        },
        trailingBlock: false,
      }),
    );
    otherEditor.mount(document.createElement("div"));
    mounted.push(otherEditor);
    otherEditor.updateBlock("title", { content: "Title of the other user" });
    Y.applyUpdate(fragment.doc!, Y.encodeStateAsUpdate(other));

    agent.acceptAll();

    expect(textsOf(editor.document)).toEqual([
      "Title of the other user",
      "Opening paragraph.",
      "Closing paragraph.",
    ]);
  });
});

describe("a proposal that a server made", () => {
  /** A proposal of the test document with one tool call, as a server run makes it. */
  function serverProposal() {
    return writeMarkdown(
      headlessEditorFactory(),
      createProposal(initialDocument()),
      "# Title\n\nOpening paragraph.\n\nSecond paragraph.\n",
      "server-call",
    );
  }

  it("opens with the same display and the same accept", () => {
    const reviews: string[] = [];
    const editor = BlockNoteEditor.create({
      initialContent: initialDocument(),
      trailingBlock: false,
      extensions: [
        AIExtension(),
        // No transport: this client starts no run.
        DocumentAgentExtension({
          onClose: (result) => reviews.push(result),
        }),
      ],
    });
    editor.mount(document.createElement("div"));
    mounted.push(editor);
    const agent = editor.getExtension(DocumentAgentExtension)!;

    agent.openProposal(serverProposal());

    expect(reviewOf(agent)).toMatchObject({
      status: "reviewing",
      toolCalls: [["server-call", "Reason of server-call", "open"]],
    });
    expect(suggestionsOf(editor)).toEqual([
      ["deletion", 1, "First"],
      ["insertion", 1, "Opening"],
    ]);

    agent.acceptAll();

    expect(textsOf(editor.document)[1]).toBe("Opening paragraph.");
    expect(reviews).toEqual(["accepted"]);
  });

  it("gives an error for a proposal that does not give the document of its last batch", () => {
    const { editor, agent } = createEditor([]);
    const proposal = serverProposal();

    agent.openProposal({
      ...proposal,
      batches: [{ ...proposal.batches[0], hash: "another-hash" }],
    });

    expect(agent.store.state).toMatchObject({
      status: "error",
      error: "out-of-sync",
    });
    expect(hasSuggestions(editor.prosemirrorState.doc)).toBe(false);
  });
});

describe("the document of the editor in the state idle", () => {
  it("never has suggestion marks: an app can save it as the main document", async () => {
    const { editor, agent } = createEditor(twoEdits);
    // An app saves the document in the state idle: after each change of
    // the editor, and when the state becomes idle.
    const saved: [boolean, string][] = [];
    function save() {
      if (agent.store.state.status === "idle") {
        saved.push([
          hasSuggestions(editor.prosemirrorState.doc),
          textsOf(editor.document)[1],
        ]);
      }
    }
    editor.onChange(save);
    agent.store.subscribe(save);
    const proposal = writeMarkdown(
      headlessEditorFactory(),
      createProposal(initialDocument()),
      "# Title\n\nOpening paragraph.\n\nSecond paragraph.\n",
      "call-1",
    );

    // A proposal of a host, a reject, a run of the user, and an accept.
    agent.openProposal(proposal);
    expect(hasSuggestions(editor.prosemirrorState.doc)).toBe(true);
    agent.rejectAll();
    await agent.invoke("Improve the text.");
    agent.acceptAll();

    // No save has a suggestion mark. The save after the reject has the
    // main document, and the save after the accept has the accepted text.
    expect(saved.map(([marks]) => marks)).not.toContain(true);
    expect(saved.at(0)?.[1]).toBe("First paragraph.");
    expect(saved.at(-1)?.[1]).toBe("Opening paragraph.");
  });
});

describe("the guards for the main document", () => {
  it("does not tell an app about the display: an app that saves after each change gets only the main document", async () => {
    const { editor, agent } = createEditor(twoEdits);
    // An app that saves the document after each change, without a check
    // of the state of the agent.
    const saved: [boolean, string[]][] = [];
    editor.onChange(() => {
      saved.push([
        hasSuggestions(editor.prosemirrorState.doc),
        textsOf(editor.document),
      ]);
    });

    await agent.invoke("Improve the text.");
    agent.rejectToolCall("call-3");
    // The display of the proposal, and of the reject, gave no change.
    expect(hasSuggestions(editor.prosemirrorState.doc)).toBe(true);
    expect(saved).toEqual([]);

    agent.acceptToolCall("call-2");

    // The accept is the only change, and it is the main document.
    expect(saved).toEqual([
      [false, ["Title", "Opening paragraph.", "Second paragraph."]],
    ]);
  });

  it("gives the main document while the editor shows a proposal", async () => {
    const { editor, agent } = createEditor(twoEdits);
    await agent.invoke("Improve the text.");

    // The Block JSON of the editor has the deleted and the inserted text
    // as normal text: it is not safe to save.
    expect(textsOf(editor.document)).toEqual([
      "Title",
      "FirstOpening paragraph.",
      "SecondClosing paragraph.",
    ]);
    expect(agent.mainDocument()).toEqual(initialDocument());
    expect(() => assertNoSuggestions(editor, "A save")).toThrow(
      "A save: the document of the editor has suggestion marks",
    );

    agent.acceptAll();
    expect(agent.mainDocument()).toEqual(editor.document);
    expect(textsOf(agent.mainDocument())).toEqual([
      "Title",
      "Opening paragraph.",
      "Closing paragraph.",
    ]);
  });

  it("throws for a change of the document by an app while the editor shows a proposal", async () => {
    const { editor, agent } = createEditor(twoEdits);
    await agent.invoke("Improve the text.");
    const before = editor.prosemirrorState.doc;

    expect(() =>
      editor.updateBlock("p2", { content: "A change of an app." }),
    ).toThrow("The editor shows a proposal as suggestions");

    // The transaction did not apply, and the review continues.
    expect(editor.prosemirrorState.doc.eq(before)).toBe(true);
    agent.rejectAll();
    editor.updateBlock("p2", { content: "A change of an app." });
    expect(textsOf(editor.document)[2]).toBe("A change of an app.");
  });
});

describe("the review of a user in the chat", () => {
  /** The tool call ID and the review in the output of each tool part of the chat. */
  function reviewsOf(agent: { getChat(): { messages: UIMessage[] } }) {
    return agent
      .getChat()
      .messages.flatMap((message) => message.parts)
      .flatMap((part) => {
        const tool = part as {
          type: string;
          toolCallId?: string;
          output?: { review?: string; version?: string };
        };
        return tool.type === "tool-editText"
          ? [[tool.toolCallId, tool.output?.review]]
          : [];
      });
  }

  it("is in the output of each tool call: the agent gets it in a later run", async () => {
    const { agent } = createEditor(twoEdits);
    await agent.invoke("Improve the text.");
    expect(reviewsOf(agent)).toEqual([
      ["call-2", undefined],
      ["call-3", undefined],
    ]);

    agent.rejectToolCall("call-2");
    expect(reviewsOf(agent)).toEqual([
      ["call-2", "rejected"],
      ["call-3", undefined],
    ]);

    // The accept of the proposal accepts the tool calls without a decision.
    agent.acceptAll();
    expect(reviewsOf(agent)).toEqual([
      ["call-2", "rejected"],
      ["call-3", "accepted"],
    ]);
  });
});

describe("the chat of the editor", () => {
  it("stays after a review: a later run has the messages of the earlier runs", async () => {
    const { model, prompts } = scriptedModel([
      {
        toolCalls: [
          {
            toolName: "editText",
            input: { old: "First", new: "Opening", reason: "A better word." },
          },
        ],
      },
      { text: "I changed one word." },
      { text: "I changed the first word." },
    ]);
    const editor = BlockNoteEditor.create({
      initialContent: initialDocument(),
      trailingBlock: false,
      extensions: [
        AIExtension(),
        DocumentAgentExtension({
          transport: createInProcessTransport({ model }),
        }),
      ],
    });
    editor.mount(document.createElement("div"));
    mounted.push(editor);
    const agent = editor.getExtension(DocumentAgentExtension)!;

    await agent.invoke("Improve the text.");
    agent.acceptAll();
    await agent.invoke("What did you change?");

    expect(agent.getChat().messages.map((message) => message.role)).toEqual([
      "user",
      "assistant",
      "user",
      "assistant",
    ]);
    // The model of the second run got the first request and its answer.
    expect(prompts[2].map((message) => message.role)).toEqual([
      "system",
      "user",
      "assistant",
      "tool",
      "assistant",
      "user",
    ]);
    // The second run changed nothing: its proposal has no suggestion.
    expect(suggestionsOf(editor)).toEqual([]);
  });
});

describe("an editor of a host that keeps the proposal (a session)", () => {
  const firstEdit: ScriptedStep = {
    toolCalls: [
      {
        toolName: "editText",
        input: { old: "First", new: "Opening", reason: "A better word." },
      },
    ],
  };
  const secondEdit: ScriptedStep = {
    toolCalls: [
      {
        toolName: "editText",
        input: { old: "Second", new: "Closing", reason: "It is the end." },
      },
    ],
  };

  /**
   * A session host in this process, and an editor with a transport to it.
   * The transport is what a server route does: a message of the chat
   * starts a run, and `reconnectToStream` gives the run in progress.
   */
  function createSessionEditor(
    script: Script,
    modelOptions?: Parameters<typeof scriptedModel>[1],
  ) {
    const documents = createInMemoryDocumentStore();
    documents.write("doc", initialDocument());
    const host = createSessionHost({
      model: scriptedModel(script, modelOptions).model,
      createEditor: headlessEditorFactory(),
      proposals: createInMemoryProposalStore(),
      readMain: (documentId) => documents.read(documentId),
    });
    const transport: ChatTransport<UIMessage> = {
      resumeStreamIsReplay: true,
      async sendMessages({ messages }) {
        const message = messages.at(-1);
        const part = message?.parts[0];
        const started = await host.startRun("doc", {
          prompt: part?.type === "text" ? part.text : "",
          origin: "user",
          messageId: message?.id,
        });
        if (started.error !== undefined) {
          throw new Error(started.error);
        }
        return started.run.follow();
      },
      async reconnectToStream() {
        return host.activeRun("doc")?.follow() ?? null;
      },
    };
    const editor = BlockNoteEditor.create({
      initialContent: initialDocument(),
      trailingBlock: false,
      extensions: [AIExtension(), DocumentAgentExtension({ transport })],
    });
    editor.mount(document.createElement("div"));
    mounted.push(editor);
    const agent = editor.getExtension(DocumentAgentExtension)!;
    return { editor, agent, host };
  }

  function proposalOf(agent: { store: { state: unknown } }) {
    return (agent.store.state as { review?: { proposal: unknown } }).review
      ?.proposal;
  }

  it("shows a run that the user starts, with the proposal of the host", async () => {
    const { editor, agent, host } = createSessionEditor([
      firstEdit,
      { text: "I changed one word." },
    ]);

    await agent.invoke("Improve the start.");

    expect(reviewOf(agent).status).toBe("reviewing");
    expect(suggestionsOf(editor)).toEqual([
      ["deletion", 1, "First"],
      ["insertion", 1, "Opening"],
    ]);
    expect(proposalOf(agent)).toEqual((await host.snapshot("doc")).proposal);
  });

  it("follows a run that started outside the editor, with the same display and the same chat", async () => {
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const { editor, agent, host } = createSessionEditor(
      [firstEdit, { text: "I changed one word." }],
      { beforeToolCall: () => gate },
    );
    // A caller outside the editor starts a run, for example a script.
    const started = await host.startRun("doc", {
      prompt: "Improve the start.",
      origin: "external",
    });

    const followed = agent.follow();
    release();

    expect(await followed).toBe(true);
    expect(started.error).toBeUndefined();
    expect(reviewOf(agent)).toEqual({
      status: "reviewing",
      answer: "I changed one word.",
      toolCalls: [["call-1", "A better word.", "open"]],
    });
    expect(suggestionsOf(editor)).toEqual([
      ["deletion", 1, "First"],
      ["insertion", 1, "Opening"],
    ]);
    // The chat of the editor has the message of the agent, from the stream.
    expect(agent.getChat().messages.map((message) => message.role)).toEqual([
      "assistant",
    ]);
    // The review is the same as for a run of this client.
    agent.acceptAll();
    expect(textsOf(editor.document)).toEqual([
      "Title",
      "Opening paragraph.",
      "Second paragraph.",
    ]);
  });

  it("takes the proposal of the host when it follows a later run", async () => {
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const { editor, agent, host } = createSessionEditor(
      [firstEdit, { text: "Done." }, secondEdit, { text: "Done again." }],
      {
        beforeToolCall: (toolCallId) =>
          toolCallId === "call-2" ? gate : Promise.resolve(),
      },
    );
    // The first run ends before this editor follows: the editor has no
    // copy of the proposal.
    const first = await host.startRun("doc", {
      prompt: "Improve the start.",
      origin: "external",
    });
    if (first.error !== undefined) {
      throw new Error(first.error);
    }
    await first.run.done;
    await host.startRun("doc", { prompt: "Improve the end.", origin: "user" });

    const followed = agent.follow();
    release();

    expect(await followed).toBe(true);
    expect(suggestionsOf(editor)).toEqual([
      ["deletion", 1, "First"],
      ["insertion", 1, "Opening"],
      ["deletion", 2, "Second"],
      ["insertion", 2, "Closing"],
    ]);
    expect(proposalOf(agent)).toEqual((await host.snapshot("doc")).proposal);
  });

  it("locks the editor without the AI menu, for an app with its own review surface", async () => {
    const documents = createInMemoryDocumentStore();
    documents.write("doc", initialDocument());
    const editor = BlockNoteEditor.create({
      initialContent: initialDocument(),
      trailingBlock: false,
      extensions: [
        AIExtension(),
        DocumentAgentExtension({
          aiMenu: false,
          transport: createInProcessTransport({
            model: scriptedModel([firstEdit, { text: "Done." }]).model,
          }),
        }),
      ],
    });
    editor.mount(document.createElement("div"));
    mounted.push(editor);
    const agent = editor.getExtension(DocumentAgentExtension)!;
    const ai = editor.getExtension(AIExtension)!;

    await agent.invoke("Improve the start.");

    // The review locks the editor, and the AI menu stays closed.
    expect(reviewOf(agent).status).toBe("reviewing");
    expect(editor.isEditable).toBe(false);
    expect(ai.store.state.aiMenuState).toBe("closed");

    agent.acceptAll();

    expect(editor.isEditable).toBe(true);
    expect(textsOf(editor.document)[1]).toBe("Opening paragraph.");
  });

  it("does not change the state if there is no run to follow", async () => {
    const { editor, agent } = createSessionEditor([]);

    expect(await agent.follow()).toBe(false);

    expect(agent.store.state).toEqual({ status: "idle" });
    expect(editor.isEditable).toBe(true);
  });
});
