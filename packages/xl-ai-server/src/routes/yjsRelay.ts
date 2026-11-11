import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import * as Y from "yjs";

// A small Yjs collaboration server for the demo of the document agent. It
// keeps one Y.Doc for each room, and relays the updates of the clients:
//
// - `GET /:room`: the state of the Y.Doc, as one Yjs update.
// - `POST /:room`: a Yjs update of a client.
// - `GET /:room/events`: server-sent events with the state, then each
//   update (base64).
//
// This is the role of a collaboration server (y-websocket, Hocuspocus):
// it has the documents. The document agent is a client of it: it reads the
// state over HTTP for each tool call (see `yjsDocumentSource.ts`), and does
// not use the Y.Doc of this file.

export const yjsRelayRoute = new Hono();

type Room = { doc: Y.Doc; listeners: Set<(update: Uint8Array) => void> };
const rooms = new Map<string, Room>();

function roomOf(name: string): Room {
  let room = rooms.get(name);
  if (room === undefined) {
    const doc = new Y.Doc();
    const listeners = new Set<(update: Uint8Array) => void>();
    doc.on("update", (update: Uint8Array) => {
      for (const listener of listeners) {
        listener(update);
      }
    });
    room = { doc, listeners };
    rooms.set(name, room);
  }
  return room;
}

function toBase64(update: Uint8Array): string {
  return Buffer.from(update).toString("base64");
}

yjsRelayRoute.get("/:room", (c) => {
  const { doc } = roomOf(c.req.param("room"));
  return c.body(Buffer.from(Y.encodeStateAsUpdate(doc)), 200, {
    "Content-Type": "application/octet-stream",
  });
});

yjsRelayRoute.post("/:room", async (c) => {
  const { doc } = roomOf(c.req.param("room"));
  Y.applyUpdate(doc, new Uint8Array(await c.req.arrayBuffer()));
  return c.json({ ok: true });
});

yjsRelayRoute.get("/:room/events", (c) => {
  const room = roomOf(c.req.param("room"));
  return streamSSE(c, async (stream) => {
    function send(update: Uint8Array) {
      void stream.writeSSE({ data: toBase64(update) });
    }
    room.listeners.add(send);
    send(Y.encodeStateAsUpdate(room.doc));
    // Keep the stream open until the client closes it.
    await new Promise<void>((resolve) => stream.onAbort(resolve));
    room.listeners.delete(send);
  });
});
