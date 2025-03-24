import {
  ClientSideSuspense,
  LiveblocksProvider,
  RoomProvider,
} from "@liveblocks/react/suspense";
import "@liveblocks/react-ui/styles.css";
import "@liveblocks/react-ui/styles/dark/media-query.css";
import "@liveblocks/react-tiptap/styles.css";

import { Editor } from "./Editor.js";
import "./globals.css";

export default function App() {
  return (
    <LiveblocksProvider
      publicApiKey={
        "pk_prod_AXsBTXOZHneix0U9mF-AxyLTg2vKNXhmD91ebPEr7vRBfMtzmX_mp0aW4TghyM2u"
      }>
      <RoomProvider id="my-room">
        <ClientSideSuspense fallback={<div>Loading…</div>}>
          <Editor />
        </ClientSideSuspense>
      </RoomProvider>
    </LiveblocksProvider>
  );
}
