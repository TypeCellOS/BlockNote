import { BlockNoteEditor } from "@blocknote/core";
import { withCollaboration } from "@blocknote/core/y";
import * as Y from "@y/y";
import type { ChatTransport, UIMessage } from "ai";
import { afterEach, describe, expect, it } from "vite-plus/test";

import { AIExtension } from "../../AIExtension.js";
import { documentAgentOf } from "../client/agentExtension.js";
import { scriptedModel, type ScriptedStep } from "../testUtil.js";
import { createSuggestionReview } from "./review.js";
import {
  createSuggestionCollaboration,
  SuggestionAgentExtension,
} from "./suggestionAgentExtension.js";
import { keepSuggestionCurrent } from "./suggestionDocument.js";
import { createSuggestionSessionHost } from "./suggestionSessions.js";
import {
  FRAGMENT,
  initialMain,
  mainReplicaOf,
  suggestionMarksOf,
  suggestionReplicaOf,
  textsOfDoc,
} from "./testUtil.js";

// jsdom has no layout: it does not have `scrollIntoView`.
Element.prototype.scrollIntoView = function scrollIntoView() {
  // No scroll in jsdom.
};

const cleanups: (() => void)[] = [];
afterEach(() => {
  while (cleanups.length) {
    cleanups.pop()?.();
  }
});

const editFirst: ScriptedStep = {
  toolCalls: [
    {
      toolName: "editText",
      input: { old: "First", new: "Opening", reason: "A better word" },
    },
  ],
};
const editSecond: ScriptedStep = {
  toolCalls: [
    {
      toolName: "editText",
      input: { old: "Second", new: "Closing", reason: "A clearer end" },
    },
  ],
};

/**
 * A host in Yjs 14 mode in this process, and an editor with a transport to
 * it. The transport is what a server route does: a message of the chat
 * starts a run, and `reconnectToStream` gives the run in progress. The two
 * documents of the editor get each update of the host at once.
 */
function createSessionEditor(script: ScriptedStep[]) {
  const hostMain = initialMain();
  const hostSuggestion = suggestionReplicaOf(hostMain);
  cleanups.push(keepSuggestionCurrent(hostMain, hostSuggestion));
  const { model, prompts } = scriptedModel(script);
  const host = createSuggestionSessionHost({
    model,
    openSuggestion: async () => ({
      suggestion: hostSuggestion,
      fragment: FRAGMENT,
    }),
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

  // The editor: replicas of the two documents, with a network to the host.
  const main = mainReplicaOf(hostMain);
  const suggestion = suggestionReplicaOf(hostSuggestion);
  const forward = (from: Y.Doc, to: Y.Doc) => {
    const onUpdate = (update: Uint8Array) => Y.applyUpdate(to, update);
    from.on("update", onUpdate);
    cleanups.push(() => from.off("update", onUpdate));
  };
  forward(hostMain, main);
  forward(main, hostMain);
  forward(hostSuggestion, suggestion);
  forward(suggestion, hostSuggestion);
  const setup = createSuggestionCollaboration({
    main,
    suggestion,
    fragment: FRAGMENT,
  });
  const editor = BlockNoteEditor.create(
    withCollaboration({
      collaboration: {
        ...setup.collaboration,
        user: { name: "User", color: "#ff0000" },
      },
      trailingBlock: false,
      extensions: [
        AIExtension(),
        SuggestionAgentExtension({
          transport,
          aiMenu: false,
          main,
          suggestion,
          fragment: FRAGMENT,
        }),
      ],
    }),
  );
  const element = document.createElement("div");
  document.body.appendChild(element);
  editor.mount(element);
  cleanups.push(() => {
    editor.unmount();
    element.remove();
    setup.destroy();
  });
  const agent = editor.getExtension(SuggestionAgentExtension)!;
  return { editor, agent, host, hostMain, hostSuggestion, main, prompts };
}

describe("the document agent in an editor, in Yjs 14 mode", () => {
  it("shows the changes of a run that the user starts, and does not lock the editor", async () => {
    const { editor, agent, main } = createSessionEditor([
      editFirst,
      { text: "Done." },
    ]);

    await agent.invoke("Improve the text.");

    const state = agent.store.state;
    expect(state.status).toBe("reviewing");
    expect(state.status === "idle" ? [] : state.review.toolCalls).toEqual([
      { toolCallId: "call-1", reason: "A better word", state: "open" },
    ]);
    expect(state.status === "idle" ? "" : state.review.answer).toBe("Done.");
    expect(suggestionMarksOf(editor.prosemirrorState.doc)).toEqual([
      "F delete call-1",
      "Open insert call-1",
      "rst delete call-1",
      "ng insert call-1",
    ]);
    // The main document does not have the change, and a user can type.
    expect(agent.mainDocument()[1].content).toMatchObject([
      { text: "First paragraph." },
    ]);
    expect(editor.isEditable).toBe(true);
    editor.updateBlock("title", { content: "Title of the user" });
    expect(textsOfDoc(main)[0]).toBe("Title of the user");
  });

  it("accepts one tool call, and ends the review after the decision of a different user", async () => {
    const { editor, agent, hostMain, hostSuggestion } = createSessionEditor([
      editFirst,
      editSecond,
      { text: "Done." },
    ]);
    await agent.invoke("Improve the text.");

    agent.acceptToolCall("call-1");

    expect(textsOfDoc(hostMain)).toEqual([
      "Title",
      "Opening paragraph.",
      "Second paragraph.",
    ]);
    const state = agent.store.state;
    expect(
      state.status === "idle"
        ? []
        : state.review.toolCalls.map((call) => call.state),
    ).toEqual(["accepted", "open"]);

    // A different user rejects the other tool call: a change of the two
    // documents, which this editor gets through the Yjs sync.
    createSuggestionReview({
      main: hostMain,
      suggestion: hostSuggestion,
    }).rejectToolCall("call-2");

    expect(agent.store.state.status).toBe("idle");
    // The chat of this editor has the two decisions: a card of a tool call
    // shows the decision of each user.
    expect(
      agent
        .getChat()
        .messages.flatMap((message) => message.parts)
        .flatMap((part) =>
          part.type === "tool-editText" && part.state === "output-available"
            ? [(part.output as { review?: string }).review]
            : [],
        ),
    ).toEqual(["accepted", "rejected"]);
    expect(suggestionMarksOf(editor.prosemirrorState.doc)).toEqual([]);
    expect(textsOfDoc(hostMain)).toEqual([
      "Title",
      "Opening paragraph.",
      "Second paragraph.",
    ]);
  });

  it("tells the agent the decision of the user in the next run", async () => {
    const { agent, prompts } = createSessionEditor([
      editFirst,
      { text: "Done." },
      { text: "I did not change the text again." },
    ]);
    await agent.invoke("Improve the text.");
    agent.rejectAll();

    await agent.invoke("Continue.");

    expect(JSON.stringify(prompts[2])).toContain(
      "The user rejected this change",
    );
    // A run without a change has no review.
    expect(agent.store.state.status).toBe("idle");
  });

  it("gives a review surface the elements of a tool call, as each mode does", async () => {
    const { editor, agent } = createSessionEditor([
      editFirst,
      { text: "Done." },
    ]);
    await agent.invoke("Improve the text.");

    const shared = documentAgentOf(editor);
    const marks = editor.domElement!.querySelectorAll(
      shared!.suggestionSelector("call-1"),
    );

    // jsdom gives the elements of a selector list in the order of the
    // selectors, not of the document.
    expect([...marks].map((mark) => mark.textContent).sort()).toEqual([
      "F",
      "Open",
      "ng",
      "rst",
    ]);
    expect(shared!.toolCallOfElement(marks[1])).toBe("call-1");
    expect(shared!.toolCallOfElement(editor.domElement!)).toBeUndefined();
    expect(shared!.getState()).toBe(agent.store.state);
  });
});
