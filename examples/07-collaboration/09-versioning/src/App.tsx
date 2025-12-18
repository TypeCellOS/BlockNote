import "@blocknote/core/fonts/inter.css";
import {
  localStorageEndpoints,
  VersioningExtension,
} from "@blocknote/core/extensions";
import {
  BlockNoteViewEditor,
  useCreateBlockNote,
  VersioningSidebar,
} from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";

import "./style.css";
// import YPartyKitProvider from "y-partykit/provider";
import * as Y from "yjs";

const doc = new Y.Doc();

export default function App() {
  const editor = useCreateBlockNote({
    collaboration: {
      // Where to store BlockNote data in the Y.Doc:
      fragment: doc.getXmlFragment(),
      // Information (name and color) for this user:
      user: {
        name: "My Username",
        color: "#ff0000",
      },
    },
    extensions: [
      VersioningExtension({
        endpoints: localStorageEndpoints,
        fragment: doc.getXmlFragment(),
      }),
    ],
  });

  // Renders the editor instance.
  return (
    <BlockNoteView
      className={"version-history-main-container"}
      editor={editor}
      renderEditor={false}
      onChange={() => console.log(doc.getXmlFragment().toJSON())}
    >
      <div className={"editor-section"}>
        <h1>Editor</h1>
        <BlockNoteViewEditor />
      </div>
      <div className={"version-history-section"}>
        <h1>Version History</h1>
        <VersioningSidebar />
      </div>
    </BlockNoteView>
  );
}
