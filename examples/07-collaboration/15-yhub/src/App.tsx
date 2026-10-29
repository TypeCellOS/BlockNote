import "@blocknote/core/fonts/inter.css";
import { withCollaboration } from "@blocknote/core/y";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { useCreateBlockNote } from "@blocknote/react";
import { WebsocketProvider } from "@y/websocket";
import * as Y from "@y/y";

const user = {
  id: crypto.randomUUID(),
  name: "My Username",
  color: "#ff0000",
};

const doc = new Y.Doc();
const provider = new WebsocketProvider(
  "wss://yhub.teleportal.tools/api/ws/v1",
  // YHub rooms use "organization/document". Use your own names in production.
  "blocknote/blocknote-yhub-example",
  doc,
  { params: { userid: user.id } },
);

export default function App() {
  const editor = useCreateBlockNote(
    withCollaboration({
      collaboration: {
        provider,
        fragment: doc.get("bn"),
        user,
      },
    }),
  );

  return <BlockNoteView editor={editor} />;
}
