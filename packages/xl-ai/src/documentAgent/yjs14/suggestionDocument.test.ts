import * as Y from "@y/y";
import { afterEach, describe, expect, it } from "vite-plus/test";

import { runDocumentAgent } from "../agent/documentAgent.js";
import { scriptedModel } from "../testUtil.js";
import {
  editText,
  readDocument,
  writeDocument,
} from "../tools/documentTools.js";
import { createSuggestionReview } from "./review.js";
import {
  createSuggestionDocument,
  keepSuggestionCurrent,
  type SuggestionDocument,
} from "./suggestionDocument.js";
import {
  createSuggestionClient,
  FRAGMENT,
  initialMain,
  suggestionMarksOf,
  suggestionReplicaOf,
  type SuggestionClient,
  syncDocs,
  textsOfDoc,
} from "./testUtil.js";
import { TOOL_CALLS_TYPE, toolCallRecordsOf } from "./toolCallRecords.js";

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

/**
 * A host in Yjs 14 mode: the main document (M), the suggestion document
 * (S), and the document of the agent on S.
 */
function createHost() {
  const main = initialMain();
  const suggestion = suggestionReplicaOf(main);
  cleanups.push(keepSuggestionCurrent(main, suggestion));
  const document: SuggestionDocument = createSuggestionDocument({
    suggestion,
    fragment: FRAGMENT,
  });
  cleanups.push(() => document.destroy());
  return { main, suggestion, document };
}

type Host = ReturnType<typeof createHost>;

function createClient(host: Host): SuggestionClient {
  const client = createSuggestionClient(host.main, host.suggestion);
  cleanups.push(() => client.destroy());
  return client;
}

/** Sends all updates between the host and the client, for the two documents. */
function sync(host: Host, client: SuggestionClient) {
  syncDocs(host.main, client.main);
  syncDocs(host.suggestion, client.suggestion);
}

/** Two tool calls: the first changes the first paragraph and adds a paragraph, the second changes the second paragraph. */
async function twoCalls(host: Host) {
  await writeDocument(
    host.document,
    {
      markdown:
        "# Title\n\nOpening paragraph.\n\nSecond paragraph.\n\nNew paragraph.\n",
      base: "v0",
      reason: "Reason one",
    },
    "call-1",
  );
  await editText(
    host.document,
    { old: "Second paragraph", new: "Second sentence", reason: "Reason two" },
    "call-2",
  );
}

describe("the document of an agent in Yjs 14 mode", () => {
  it("writes a change as a suggestion: the main document does not change", async () => {
    const host = createHost();

    const output = await editText(
      host.document,
      { old: "First", new: "Opening", reason: "A better word" },
      "call-1",
    );

    expect(output).toEqual({ version: "v1", changed: true, notes: [] });
    expect(textsOfDoc(host.suggestion)).toEqual([
      "Title",
      "Opening paragraph.",
      "Second paragraph.",
    ]);
    expect(textsOfDoc(host.main)).toEqual([
      "Title",
      "First paragraph.",
      "Second paragraph.",
    ]);
    expect(
      toolCallRecordsOf(host.suggestion).map((record) => [
        record.toolCallId,
        record.reason,
        record.decision,
      ]),
    ).toEqual([["call-1", "A better word", undefined]]);
  });

  it("stores a record as values that Yjs can freeze", async () => {
    // Yjs 14 freezes an attribute value that is an object, except in a
    // test run. A binary array in such an object cannot freeze: the write
    // of the record then throws on a server and in a browser.
    const host = createHost();
    await editText(
      host.document,
      { old: "First", new: "Opening", reason: "A better word" },
      "call-1",
    );

    const kinds: string[] = [];
    host.suggestion
      .get(TOOL_CALLS_TYPE)
      .forEachAttr((value: unknown, key: string | number) => {
        kinds.push(
          `${String(key).split(":")[0]} ${value instanceof Uint8Array ? "binary" : typeof value}`,
        );
        if (typeof value === "object" && !(value instanceof Uint8Array)) {
          for (const field of Object.values(value ?? {})) {
            expect(typeof field === "object").toBe(false);
          }
        }
      });
    expect(kinds.sort()).toEqual([
      "call object",
      "deletes binary",
      "inserts binary",
    ]);
  });

  it("gives the same tool errors as the proposal mode", async () => {
    const host = createHost();

    expect(
      await editText(
        host.document,
        { old: "No such text", new: "x", reason: "r" },
        "call-1",
      ),
    ).toEqual({ error: "not-found", field: "old" });
    expect(
      await writeDocument(
        host.document,
        { markdown: "# Title\n", base: "v9", reason: "r" },
        "call-2",
      ),
    ).toEqual({ error: "unknown-version" });
    // A tool call without a change has no record.
    expect(toolCallRecordsOf(host.suggestion)).toEqual([]);
  });

  it("tells the agent that a user changed the document, and keeps that change", async () => {
    const host = createHost();
    const client = createClient(host);
    const opening = await readDocument(host.document);

    // A user changes the title while the agent works.
    client.editor.updateBlock("title", { content: "Title of the user" });
    sync(host, client);

    // The agent writes from the version that it read.
    const output = await writeDocument(
      host.document,
      {
        markdown: "# Title\n\nOpening paragraph.\n\nSecond paragraph.\n",
        base: opening.version,
        reason: "A better word",
      },
      "call-1",
    );

    expect(output).toMatchObject({
      changed: true,
      notes: [{ type: "main-changed" }],
    });
    expect(textsOfDoc(host.suggestion)).toEqual([
      "Title of the user",
      "Opening paragraph.",
      "Second paragraph.",
    ]);
    expect(textsOfDoc(host.main)).toEqual([
      "Title of the user",
      "First paragraph.",
      "Second paragraph.",
    ]);
  });

  it("gives a conflict if a user changed the same text after the read of the agent", async () => {
    const host = createHost();
    const client = createClient(host);
    const opening = await readDocument(host.document);
    // The user and the agent change the same word.
    client.editor.updateBlock("p1", { content: "Initial paragraph." });
    sync(host, client);

    const output = await writeDocument(
      host.document,
      {
        markdown: "# Title\n\nOpening paragraph.\n\nSecond paragraph.\n",
        base: opening.version,
        reason: "A better word",
      },
      "call-1",
    );

    expect(output).toMatchObject({ error: "conflict" });
    expect(toolCallRecordsOf(host.suggestion)).toEqual([]);
    expect(textsOfDoc(host.suggestion)[1]).toBe("Initial paragraph.");
  });

  it("runs the loop of the agent on a suggestion document", async () => {
    const host = createHost();
    const { model } = scriptedModel([
      {
        toolCalls: [
          {
            toolName: "editText",
            input: { old: "First", new: "Opening", reason: "A better word" },
          },
        ],
      },
      { text: "Done." },
    ]);

    const run = await runDocumentAgent(host.document, "Improve the text.", {
      model,
    });

    expect(run.text).toBe("Done.");
    expect(textsOfDoc(host.suggestion)).toContain("Opening paragraph.");
    expect(textsOfDoc(host.main)).toContain("First paragraph.");
    expect(
      toolCallRecordsOf(host.suggestion).map((record) => record.reason),
    ).toEqual(["A better word"]);
  });
});

describe("the review of the changes of an agent in Yjs 14 mode", () => {
  it("shows each suggestion with the ID of its tool call, in an editor that was open before", async () => {
    const host = createHost();
    const client = createClient(host);
    // Each update of the host goes to the client when the host makes it.
    host.suggestion.on("update", (update: Uint8Array) =>
      Y.applyUpdate(client.suggestion, update),
    );

    await twoCalls(host);

    expect(suggestionMarksOf(client.editor.prosemirrorState.doc)).toEqual([
      "F delete call-1",
      "Open insert call-1",
      "rst delete call-1",
      "ng insert call-1",
      "paragraph delete call-2",
      "sentence insert call-2",
      "<blockContainer> insert call-1",
      "<paragraph> insert call-1",
      "New paragraph. insert call-1",
    ]);
    expect(client.review.toolCalls()).toEqual([
      { toolCallId: "call-1", reason: "Reason one", state: "open" },
      { toolCallId: "call-2", reason: "Reason two", state: "open" },
    ]);
  });

  it("lets a user change the document during the review", async () => {
    const host = createHost();
    const client = createClient(host);
    await twoCalls(host);
    sync(host, client);

    client.editor.updateBlock("title", { content: "Title of the user" });

    // The change is in the main document, and the suggestions stay.
    expect(textsOfDoc(client.main)[0]).toBe("Title of the user");
    expect(client.review.toolCalls().map((call) => call.state)).toEqual([
      "open",
      "open",
    ]);
    expect(suggestionMarksOf(client.editor.prosemirrorState.doc)).toHaveLength(
      9,
    );
  });

  it("accepts one tool call: only its change goes to the main document", async () => {
    const host = createHost();
    const client = createClient(host);
    await twoCalls(host);
    sync(host, client);

    expect(client.review.acceptToolCall("call-2")).toEqual({});

    expect(textsOfDoc(client.main)).toEqual([
      "Title",
      "First paragraph.",
      "Second sentence.",
    ]);
    expect(client.review.toolCalls().map((call) => call.state)).toEqual([
      "open",
      "accepted",
    ]);
    // The suggestions of the other tool call stay.
    expect(
      suggestionMarksOf(client.editor.prosemirrorState.doc).every((mark) =>
        mark.endsWith("call-1"),
      ),
    ).toBe(true);
    expect(client.review.acceptToolCall("call-2")).toEqual({
      error: "decided",
    });
    expect(client.review.acceptToolCall("call-9")).toEqual({
      error: "unknown-tool-call",
    });
  });

  it("writes the text one time if two users accept a tool call at the same time", async () => {
    // The same case is a known failure in proposal mode without the accept
    // guard: there, each accept is a new write of the lens.
    const host = createHost();
    const a = createClient(host);
    const b = createClient(host);
    await twoCalls(host);
    sync(host, a);
    sync(host, b);

    a.review.acceptAll();
    b.review.acceptAll();
    sync(host, a);
    sync(host, b);
    sync(host, a);

    const expected = [
      "Title",
      "Opening paragraph.",
      "Second sentence.",
      "New paragraph.",
    ];
    expect(textsOfDoc(host.main)).toEqual(expected);
    expect(textsOfDoc(a.main)).toEqual(expected);
    expect(textsOfDoc(b.main)).toEqual(expected);
    expect(suggestionMarksOf(a.editor.prosemirrorState.doc)).toEqual([]);
    expect(suggestionMarksOf(b.editor.prosemirrorState.doc)).toEqual([]);
  });

  it("rejects one tool call: its change goes, and the other tool call stays", async () => {
    const host = createHost();
    const client = createClient(host);
    await twoCalls(host);
    sync(host, client);

    expect(client.review.rejectToolCall("call-1")).toEqual({});

    expect(textsOfDoc(client.suggestion)).toEqual([
      "Title",
      "First paragraph.",
      "Second sentence.",
    ]);
    expect(textsOfDoc(client.main)).toEqual([
      "Title",
      "First paragraph.",
      "Second paragraph.",
    ]);
    expect(suggestionMarksOf(client.editor.prosemirrorState.doc)).toEqual([
      "paragraph delete call-2",
      "sentence insert call-2",
    ]);
    // The agent reads the document without the rejected change.
    sync(host, client);
    expect((await readDocument(host.document)).markdown).toBe(
      "# Title\n\nFirst paragraph.\n\nSecond sentence.\n",
    );
  });

  it("refuses a reject on a suggestion document with garbage collection", async () => {
    const host = createHost();
    await twoCalls(host);
    const suggestion = new Y.Doc({ isSuggestionDoc: true });
    Y.applyUpdate(suggestion, Y.encodeStateAsUpdate(host.suggestion));
    const review = createSuggestionReview({ main: host.main, suggestion });

    // Without this guard, the reject removes "F" and "rst" of "First" from
    // the main document.
    expect(() => review.rejectToolCall("call-1")).toThrow(
      "needs the text of each suggested deletion",
    );
    expect(textsOfDoc(host.main)[1]).toBe("First paragraph.");
  });

  it("refuses a reject on a replica that comes from a server with garbage collection", async () => {
    // The replica of the user has no garbage collection, but its state
    // comes from a collaboration server that has it: the text of the
    // suggested deletions is not there.
    const host = createHost();
    await twoCalls(host);
    const server = new Y.Doc({ isSuggestionDoc: true });
    Y.applyUpdate(server, Y.encodeStateAsUpdate(host.suggestion));
    const suggestion = new Y.Doc({ isSuggestionDoc: true, gc: false });
    Y.applyUpdate(suggestion, Y.encodeStateAsUpdate(server));
    const review = createSuggestionReview({ main: host.main, suggestion });

    expect(() => review.rejectToolCall("call-1")).toThrow(
      "needs the text of each suggested deletion",
    );
    expect(textsOfDoc(host.main)[1]).toBe("First paragraph.");
    // An accept does not need the text of a deletion.
    expect(review.acceptToolCall("call-1")).toEqual({});
    expect(textsOfDoc(host.main)[1]).toBe("Opening paragraph.");
  });

  it.fails("KNOWN: two users who reject one suggested deletion at the same time write its text two times", async () => {
    // Yjs cannot put back a deleted item. A reject of a suggested deletion
    // inserts a copy of the text, and two rejects insert two copies. The
    // fix is in Yjs: a suggested deletion that a reject can reverse.
    const host = createHost();
    const a = createClient(host);
    const b = createClient(host);
    await twoCalls(host);
    sync(host, a);
    sync(host, b);

    a.review.rejectToolCall("call-1");
    b.review.rejectToolCall("call-1");
    sync(host, a);
    sync(host, b);
    sync(host, a);

    // Now: "FFirstrst paragraph." or a similar text.
    expect(textsOfDoc(host.main)).toEqual([
      "Title",
      "First paragraph.",
      "Second paragraph.",
    ]);
  });
});
