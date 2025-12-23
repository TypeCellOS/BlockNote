import "@blocknote/core/fonts/inter.css";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { useCreateBlockNote } from "@blocknote/react";
import * as Y from "@y/y";
import { Awareness } from "@y/protocols/awareness";

const doc = new Y.Doc();
const provider = {
  awareness: new Awareness(doc),
};

const doc2 = new Y.Doc();
const provider2 = {
  awareness: new Awareness(doc2),
};

const suggestingDoc = new Y.Doc({ isSuggestionDoc: true });
const suggestingProvider = {
  awareness: new Awareness(suggestingDoc),
};
const suggestingAttributionManager = Y.createAttributionManagerFromDiff(
  doc,
  suggestingDoc,
  {
    attrs: [Y.createAttributionItem("insert", ["nickthesick"])],
  },
);
suggestingAttributionManager.suggestionMode = false;

const suggestionModeDoc = new Y.Doc({ isSuggestionDoc: true });
const suggestionModeProvider = {
  awareness: new Awareness(suggestionModeDoc),
};
const suggestionModeAttributionManager = Y.createAttributionManagerFromDiff(
  doc,
  suggestionModeDoc,
  { attrs: [Y.createAttributionItem("insert", ["nickthesick"])] },
);
suggestionModeAttributionManager.suggestionMode = true;

// Function to sync two documents
function syncDocs(sourceDoc: Y.Doc, targetDoc: Y.Doc) {
  // Create update message from source
  const update = Y.encodeStateAsUpdate(sourceDoc);

  // Apply update to target
  Y.applyUpdate(targetDoc, update);
}

// Set up two-way sync
function setupTwoWaySync(doc1: Y.Doc, doc2: Y.Doc) {
  // Sync initial states
  syncDocs(doc1, doc2);
  syncDocs(doc2, doc1);

  // Set up observers for future changes
  doc1.on("update", (update: Uint8Array) => {
    Y.applyUpdate(doc2, update);
  });

  doc2.on("update", (update: Uint8Array) => {
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
  fragment: Y.XmlFragment;
  provider: { awareness: Awareness };
  attributionManager?: Y.AbstractAttributionManager;
}) {
  const editor = useCreateBlockNote({
    collaboration: {
      fragment,
      provider,
      user: {
        name: "Hello",
        color: "#FFFFFF",
      },
      attributionManager,
    },
  });

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
          <Editor fragment={doc.getXmlFragment("doc")} provider={provider} />
        </div>
        <div style={{ flex: 1 }}>
          Client B
          <Editor fragment={doc2.getXmlFragment("doc")} provider={provider2} />
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
            fragment={suggestingDoc.getXmlFragment("doc")}
            provider={suggestingProvider}
            attributionManager={suggestingAttributionManager}
          />
        </div>
        <div style={{ flex: 1 }}>
          Suggestion Mode
          <Editor
            fragment={suggestionModeDoc.getXmlFragment("doc")}
            provider={suggestionModeProvider}
            attributionManager={suggestionModeAttributionManager}
          />
        </div>
      </div>
    </div>
  );
}
