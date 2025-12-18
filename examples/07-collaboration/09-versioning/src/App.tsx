import "@blocknote/core/fonts/inter.css";
import {
  localStorageEndpoints,
  VersioningExtension,
} from "@blocknote/core/extensions";
import {
  BlockNoteViewEditor,
  useCreateBlockNote,
  useExtensionState,
  VersioningSidebar,
} from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import * as Y from "yjs";

import "./style.css";

const doc = new Y.Doc();

export default function App() {
  const editor = useCreateBlockNote({
    collaboration: {
      fragment: doc.getXmlFragment(),
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

  const { selectedSnapshotId } = useExtensionState(VersioningExtension, {
    editor,
  });

  return (
    <BlockNoteView
      className={"version-history-main-container"}
      editor={editor}
      renderEditor={false}
      onChange={() => console.log(doc.getXmlFragment().toJSON())}
    >
      <div className={"editor-section"}>
        <h1>Editor {selectedSnapshotId !== undefined ? "(Preview)" : ""}</h1>
        <BlockNoteViewEditor />
      </div>
      <div className={"version-history-section"}>
        <h1>Version History</h1>
        <VersioningSidebar />
      </div>
    </BlockNoteView>
  );
}
