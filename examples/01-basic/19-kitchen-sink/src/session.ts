import { BlockNoteEditor } from "@blocknote/core";
import { blocksToYDoc } from "@blocknote/core/yjs";
import {
  Awareness,
  applyAwarenessUpdate,
  encodeAwarenessUpdate,
} from "y-protocols/awareness";
import * as Y from "yjs";
import { schema } from "./schema.js";
import { standardBlocks } from "./documents/index.js";

type Message =
  | { type: "hello" }
  | { type: "document" | "awareness"; update: Uint8Array };

export async function createSession() {
  const url = new URL(window.location.href);
  const room = url.searchParams.get("room") ?? crypto.randomUUID();

  url.searchParams.set("room", room);
  window.history.replaceState(window.history.state, "", url);

  const key = `blocknote-kitchen-sink:${room}`;

  // Serialize first-time initialization so two tabs never insert two presets.
  const doc = await navigator.locks.request(key, () => {
    const saved = localStorage.getItem(key);

    if (saved !== null) {
      const restored = new Y.Doc();

      Y.applyUpdate(
        restored,
        Uint8Array.from(atob(saved), (character) => character.charCodeAt(0)),
      );

      return restored;
    }

    const editor = BlockNoteEditor.create({ schema });
    const seeded = blocksToYDoc(editor, standardBlocks, "blocknote");

    seeded.getMap<string>("settings").set("preset", "standard");
    save(seeded);

    return seeded;
  });

  function save(document: Y.Doc) {
    const bytes = Y.encodeStateAsUpdate(document);

    localStorage.setItem(
      key,
      btoa(Array.from(bytes, (byte) => String.fromCharCode(byte)).join("")),
    );
  }

  const awareness = new Awareness(doc);
  const channel = new BroadcastChannel(key);

  function send(message: Message) {
    channel.postMessage(message);
  }

  // Incoming updates carry the channel as their origin; only rebroadcast local changes.
  function onUpdate(update: Uint8Array, origin: unknown) {
    save(doc);

    if (origin !== channel) {
      send({ type: "document", update });
    }
  }

  function onAwareness(
    {
      added,
      updated,
      removed,
    }: { added: number[]; updated: number[]; removed: number[] },
    origin: unknown,
  ) {
    if (origin !== channel) {
      send({
        type: "awareness",
        update: encodeAwarenessUpdate(awareness, [
          ...added,
          ...updated,
          ...removed,
        ]),
      });
    }
  }

  channel.onmessage = ({ data }: MessageEvent<Message>) => {
    switch (data.type) {
      // Send the current document and cursors to newly opened tabs.
      case "hello":
        send({ type: "document", update: Y.encodeStateAsUpdate(doc) });
        send({
          type: "awareness",
          update: encodeAwarenessUpdate(
            awareness,
            Array.from(awareness.getStates().keys()),
          ),
        });
        break;

      case "document":
        Y.applyUpdate(doc, data.update, channel);
        break;

      case "awareness":
        applyAwarenessUpdate(awareness, data.update, channel);
        break;
    }
  };

  doc.on("update", onUpdate);
  awareness.on("update", onAwareness);
  send({ type: "hello" });

  const id = crypto.randomUUID();
  const user = { id, username: `User ${id.slice(0, 4)}`, avatarUrl: "" };

  function leave() {
    awareness.setLocalState(null);
  }

  window.addEventListener("pagehide", leave);

  return {
    doc,
    awareness,
    user,
    href: url.href,
    color: `hsl(${doc.clientID % 360}, 65%, 40%)`,

    destroy() {
      window.removeEventListener("pagehide", leave);
      awareness.destroy();
      channel.close();
      doc.destroy();
    },
  };
}

export type Session = Awaited<ReturnType<typeof createSession>>;
