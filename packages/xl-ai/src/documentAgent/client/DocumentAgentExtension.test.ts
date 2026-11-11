import { BlockNoteEditor, type PartialBlock } from "@blocknote/core";
import { withCollaboration } from "@blocknote/core/yjs";
import { afterEach, describe, expect, it } from "vite-plus/test";
import * as Y from "yjs";

import { AIExtension } from "../../AIExtension.js";
import {
  initialDocument,
  lastToolResult,
  scriptedModel,
  type ScriptedStep,
  textsOf,
  versionIn,
} from "../testUtil.js";
import { DocumentAgentExtension } from "./DocumentAgentExtension.js";
import { hasSuggestions } from "./suggestions.js";
import { createInProcessTransport } from "./transport.js";

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

function extensionsFor(script: Script) {
  return [
    AIExtension(),
    DocumentAgentExtension({
      // Client mode: the loop and the tools run here, with the mock model.
      transport: createInProcessTransport({
        model: scriptedModel(script).model,
      }),
    }),
  ];
}

function createEditor(script: Script) {
  const editor = BlockNoteEditor.create({
    initialContent: initialDocument(),
    trailingBlock: false,
    extensions: extensionsFor(script),
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
