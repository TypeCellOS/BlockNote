import "./style.css";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import { BlockNoteView } from "@blocknote/mantine";
import { useCreateBlockNote } from "@blocknote/react";
import { Awareness } from "@y/protocols/awareness";
import { withCollaboration } from "@blocknote/core/y";
import * as Y from "@y/y";

const doc = new Y.Doc();
const provider = {
  awareness: new Awareness(doc),
};
provider.awareness.setLocalStateField("user", {
  name: "Client A",
  color: "#30bced",
});

const doc2 = new Y.Doc();
const provider2 = {
  awareness: new Awareness(doc2),
};
provider2.awareness.setLocalStateField("user", {
  name: "Client B",
  color: "#6eeb83",
});

const attrs = new Y.Attributions();

const suggestingDoc = new Y.Doc({ isSuggestionDoc: true });
const suggestingProvider = {
  awareness: new Awareness(suggestingDoc),
};
suggestingProvider.awareness.setLocalStateField("user", {
  name: "View Suggestions",
  color: "#ffbc42",
});
const suggestingAttributionManager = Y.createAttributionManagerFromDiff(
  doc,
  suggestingDoc,
  // { attrs },
);
suggestingAttributionManager.suggestionMode = false;

const suggestionModeDoc = new Y.Doc({ isSuggestionDoc: true });
const suggestionModeProvider = {
  awareness: new Awareness(suggestionModeDoc),
};
suggestionModeProvider.awareness.setLocalStateField("user", {
  name: "Suggestion Mode",
  color: "#ee6352",
});
const suggestionModeAttributionManager = Y.createAttributionManagerFromDiff(
  doc,
  suggestionModeDoc,
  // { attrs },
);
suggestionModeAttributionManager.suggestionMode = true;

// Function to sync two documents
function syncDocs(sourceDoc: Y.Doc, targetDoc: Y.Doc) {
  const update = Y.encodeStateAsUpdate(sourceDoc);
  Y.applyUpdate(targetDoc, update);
}

// Set up two-way sync
function setupTwoWaySync(doc1: Y.Doc, doc2: Y.Doc) {
  syncDocs(doc1, doc2);
  syncDocs(doc2, doc1);

  doc1.on("update", (update) => {
    Y.applyUpdate(doc2, update);
  });

  doc2.on("update", (update) => {
    Y.applyUpdate(doc1, update);
  });
}

setupTwoWaySync(doc, doc2);
setupTwoWaySync(suggestingDoc, suggestionModeDoc);

function Editor({
  fragment,
  provider,
  attributionManager,
}: {
  fragment: Y.Type;
  provider: { awareness?: Awareness };
  attributionManager?: Y.DiffAttributionManager;
}) {
  const editor = useCreateBlockNote(
    withCollaboration({
      collaboration: {
        fragment,
        provider,
        attributionManager,
        user: { name: "Client A", color: "#30bced" },
      },
    }),
  );

  return <BlockNoteView editor={editor} />;
}

export default function App() {
  // Renders the editor instance using a React component.
  return (
    <div>
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          gap: "10px",
          margin: "10px",
        }}
      >
        <div style={{ flex: 1 }}>
          Client A
          <Editor fragment={doc.get("doc")} provider={provider} />
        </div>
        <div style={{ flex: 1 }}>
          Client B
          <Editor fragment={doc2.get("doc")} provider={provider2} />
        </div>
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          gap: "10px",
          margin: "10px",
        }}
      >
        <div style={{ flex: 1 }}>
          View Suggestions Mode
          <Editor
            fragment={suggestingDoc.get("doc")}
            provider={suggestingProvider}
            attributionManager={suggestingAttributionManager}
          />
        </div>
        <div style={{ flex: 1 }}>
          Suggestion Mode
          <Editor
            fragment={suggestionModeDoc.get("doc")}
            provider={suggestionModeProvider}
            attributionManager={suggestionModeAttributionManager}
          />
        </div>
      </div>
    </div>
  );
}
