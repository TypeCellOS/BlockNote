import * as Y from "@y/y";

/**
 * Connects a Yjs 14 Y.Doc to a document of a room of the Yjs 14 relay of
 * the BlockNote AI server (`packages/xl-ai-server/src/routes/yjs14Relay.ts`).
 * The relay sends the state and each update as server-sent events, and
 * takes the updates of this client as HTTP requests.
 *
 * `onSynced` runs after the first state arrives. The result closes the
 * connection.
 */
export function connectY14Doc(
  url: string,
  doc: Y.Doc,
  onSynced: () => void,
): () => void {
  // The origin of the updates of the relay: they do not go back to it.
  const relay = {};
  let synced = false;

  const events = new EventSource(`${url}/events`);
  events.onmessage = (event: MessageEvent<string>) => {
    const update = Uint8Array.from(atob(event.data), (char) =>
      char.charCodeAt(0),
    );
    Y.applyUpdate(doc, update, relay);
    if (!synced) {
      synced = true;
      onSynced();
    }
  };

  function send(update: Uint8Array, origin: unknown) {
    if (origin !== relay) {
      void fetch(url, { method: "POST", body: update });
    }
  }
  doc.on("update", send);

  return () => {
    events.close();
    doc.off("update", send);
  };
}
