import { keepSuggestionCurrent } from "@blocknote/xl-ai/yjs14-server";
import * as Y from "@y/y";
import { Hono } from "hono";
import { streamSSE } from "hono/streaming";

// A small Yjs 14 collaboration server for the Yjs 14 mode of the document
// agent. A room has two Y.Docs: the main document, and the suggestion
// document (the main document plus the changes of the agent that no user
// accepted). The paths have the room and the document (`main` or
// `suggestion`):
//
// - `GET /:room/:doc`: the state of the Y.Doc, as one Yjs update.
// - `POST /:room/:doc`: a Yjs update of a client.
// - `GET /:room/:doc/events`: server-sent events with the state, then each
//   update (base64).
//
// In this demo, the document agent uses the suggestion document of this
// file (see `openSuggestionOf`): the relay and the agent are one process.
// A production host has its own replica, through its Yjs provider.

export const yjs14RelayRoute = new Hono();

/** The name of the type of the document content in the two Y.Docs. */
export const YJS14_FRAGMENT = "document-store";

/** The name of the type in the suggestion document that has the session notices. */
export const YJS14_NOTICES = "document-agent-session";

const DOCS = ["main", "suggestion"] as const;
type DocName = (typeof DOCS)[number];

type Room = Record<
  DocName,
  { doc: Y.Doc; listeners: Set<(update: Uint8Array) => void> }
>;
const rooms = new Map<string, Room>();

function withListeners(doc: Y.Doc): Room[DocName] {
  const listeners = new Set<(update: Uint8Array) => void>();
  doc.on("update", (update: Uint8Array) => {
    for (const listener of listeners) {
      listener(update);
    }
  });
  return { doc, listeners };
}

function roomOf(name: string): Room {
  let room = rooms.get(name);
  if (room === undefined) {
    const main = new Y.Doc();
    // No garbage collection: a reject of a suggested deletion needs its
    // text (see `review.ts` of the Yjs 14 mode).
    const suggestion = new Y.Doc({ isSuggestionDoc: true, gc: false });
    // The suggestion document has all content of the main document.
    keepSuggestionCurrent(main, suggestion);
    room = { main: withListeners(main), suggestion: withListeners(suggestion) };
    rooms.set(name, room);
  }
  return room;
}

/** The document of a request, or `undefined` for an unknown document name. */
function docOf(room: string, name: string): Room[DocName] | undefined {
  return DOCS.includes(name as DocName)
    ? roomOf(room)[name as DocName]
    : undefined;
}

/**
 * The suggestion document of a room, for the document agent, or
 * `undefined` if the room has no document content.
 */
export function openSuggestionOf(room: string) {
  const { main, suggestion } = roomOf(room);
  return main.doc.get(YJS14_FRAGMENT).length === 0
    ? undefined
    : { suggestion: suggestion.doc, fragment: YJS14_FRAGMENT };
}

/** The number of the last session notice of each room. */
const notices = new Map<string, number>();

/**
 * Tells the editors of a room that the session of its document changed: a
 * new value in a type of the suggestion document. The editors get it
 * through their Yjs connection.
 */
export function notifySessionOf(room: string): void {
  const count = (notices.get(room) ?? 0) + 1;
  notices.set(room, count);
  roomOf(room).suggestion.doc.get(YJS14_NOTICES).setAttr("session", count);
}

function toBase64(update: Uint8Array): string {
  return Buffer.from(update).toString("base64");
}

yjs14RelayRoute.get("/:room/:doc", (c) => {
  const found = docOf(c.req.param("room"), c.req.param("doc"));
  if (found === undefined) {
    return c.json({ error: "unknown-document" }, 404);
  }
  return c.body(Buffer.from(Y.encodeStateAsUpdate(found.doc)), 200, {
    "Content-Type": "application/octet-stream",
  });
});

yjs14RelayRoute.post("/:room/:doc", async (c) => {
  const found = docOf(c.req.param("room"), c.req.param("doc"));
  if (found === undefined) {
    return c.json({ error: "unknown-document" }, 404);
  }
  Y.applyUpdate(found.doc, new Uint8Array(await c.req.arrayBuffer()));
  return c.json({ ok: true });
});

yjs14RelayRoute.get("/:room/:doc/events", (c) => {
  const found = docOf(c.req.param("room"), c.req.param("doc"));
  if (found === undefined) {
    return c.json({ error: "unknown-document" }, 404);
  }
  return streamSSE(c, async (stream) => {
    function send(update: Uint8Array) {
      void stream.writeSSE({ data: toBase64(update) });
    }
    found.listeners.add(send);
    send(Y.encodeStateAsUpdate(found.doc));
    // Keep the stream open until the client closes it.
    await new Promise<void>((resolve) => stream.onAbort(resolve));
    found.listeners.delete(send);
  });
});
