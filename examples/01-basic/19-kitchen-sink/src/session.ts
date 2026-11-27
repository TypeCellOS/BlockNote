import { WebsocketProvider } from "@y/websocket";
import * as Y from "@y/y";

export function createSession() {
  const url = new URL(window.location.href);
  const existingRoom = url.searchParams.get("room");
  const room = existingRoom ?? crypto.randomUUID();

  url.searchParams.set("room", room);
  window.history.replaceState(window.history.state, "", url);

  const id = crypto.randomUUID();
  const colors = ["#958df1", "#f98181", "#fbbc88", "#70cff8", "#94fadb"];
  const doc = new Y.Doc();
  const user = {
    id,
    name: `User ${id.slice(0, 4)}`,
    color: colors[doc.clientID % colors.length],
  };

  // Connect when the example mounts; the Yjs binding handles initial loading.
  const provider = new WebsocketProvider(
    "wss://yhub.teleportal.tools/api/ws/v1",
    `blocknote/kitchen-sink-${room}`,
    doc,
    { connect: false, params: { userid: user.id } },
  );

  return {
    doc,
    provider,
    user,
    href: url.href,
  };
}
