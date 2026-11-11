import { afterEach, describe, expect, it } from "vite-plus/test";

import {
  lastToolResult,
  scriptedModel,
  type ScriptedStep,
} from "../testUtil.js";
import { createSuggestionReview } from "./review.js";
import { keepSuggestionCurrent } from "./suggestionDocument.js";
import { createSuggestionSessionHost } from "./suggestionSessions.js";
import {
  FRAGMENT,
  initialMain,
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

function createHost(script: ScriptedStep[]) {
  const main = initialMain();
  const suggestion = suggestionReplicaOf(main);
  cleanups.push(keepSuggestionCurrent(main, suggestion));
  const { model, prompts } = scriptedModel(script);
  const changes: string[] = [];
  const host = createSuggestionSessionHost({
    model,
    openSuggestion: async (documentId) =>
      documentId === "doc" ? { suggestion, fragment: FRAGMENT } : undefined,
    onChange: (documentId) => changes.push(documentId),
  });
  return { main, suggestion, host, prompts, changes };
}

async function run(
  host: ReturnType<typeof createHost>["host"],
  prompt: string,
) {
  const started = await host.startRun("doc", { prompt, origin: "user" });
  if (started.error !== undefined) {
    throw new Error(`The run did not start: ${started.error}`);
  }
  await started.run.done;
  return started.run;
}

describe("the sessions of a host in Yjs 14 mode", () => {
  it("runs a request of the chat on the suggestion document, and keeps the chat", async () => {
    const { main, suggestion, host, changes } = createHost([
      editFirst,
      { text: "Done." },
    ]);

    await run(host, "Improve the text.");

    expect(textsOfDoc(suggestion)).toContain("Opening paragraph.");
    expect(textsOfDoc(main)).toContain("First paragraph.");
    const { messages, activeRunId } = host.snapshot("doc");
    expect(activeRunId).toBeUndefined();
    expect(messages.map((message) => message.role)).toEqual([
      "user",
      "assistant",
    ]);
    // The output of a tool call has no data for a client that follows the
    // run: the change is in the suggestion document.
    expect(
      messages[1].parts.flatMap((part) =>
        part.type === "tool-editText" && part.state === "output-available"
          ? [part.output]
          : [],
      ),
    ).toEqual([{ version: "v1", changed: true, notes: [] }]);
    // The start and the end of the run.
    expect(changes).toEqual(["doc", "doc"]);
  });

  it("gives the agent the decision of a user in its next run", async () => {
    const { main, suggestion, host, prompts } = createHost([
      editFirst,
      { text: "Done." },
      { text: "I did not change the text again." },
    ]);
    await run(host, "Improve the text.");

    // A decision of a user is a change of the two documents, without the
    // host.
    createSuggestionReview({ main, suggestion }).rejectToolCall("call-1");
    await run(host, "Continue.");

    expect(lastToolResult(prompts[2])).toContain(
      "The user rejected this change",
    );
  });

  it("has one run at a time for a document, and knows its documents", async () => {
    const { host } = createHost([editFirst, { text: "Done." }]);

    const first = host.startRun("doc", { prompt: "One.", origin: "user" });
    expect(
      await host.startRun("doc", { prompt: "Two.", origin: "user" }),
    ).toEqual({ error: "run-active" });
    expect(
      await host.startRun("other", { prompt: "Three.", origin: "user" }),
    ).toEqual({ error: "unknown-document" });
    const started = await first;
    if (started.error === undefined) {
      await started.run.done;
    }
  });
});
