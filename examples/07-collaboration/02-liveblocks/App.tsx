// See https://liveblocks.io/docs/get-started/react-blocknote to see how this
// example was created, and an explanation for all the code.
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
import "./styles.css";

export default function App() {
  return (
    <LiveblocksProvider
      publicApiKey={
        "pk_prod_6iVYNrHvG98GvWioAutXrhTkpG0iQLrzUK3nfWT4_VKWl6NIrlt112YD29to9gQH"
      }>
      <RoomProvider id="my-room">
        <ClientSideSuspense fallback={<div>Loading…</div>}>
          <Editor />
        </ClientSideSuspense>
      </RoomProvider>
    </LiveblocksProvider>
  );
}
