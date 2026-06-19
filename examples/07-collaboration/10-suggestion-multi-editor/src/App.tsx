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
  name: "Alice",
  color: "#30bced",
});

const doc2 = new Y.Doc();
const provider2 = {
  awareness: new Awareness(doc2),
};
provider2.awareness.setLocalStateField("user", {
  name: "Bob",
  color: "#6eeb83",
});

const attrs = new Y.Attributions();

// Batch timestamps: reuse the same timestamp for edits from the same user
// within a 10-second window of inactivity.
const BATCH_INTERVAL_MS = 10_000;
const batchTimestamps = new Map<string, number>();
const batchTimers = new Map<string, ReturnType<typeof setTimeout>>();

function getBatchedTimestamp(userName: string): number {
  const existing = batchTimestamps.get(userName);
  const now = Date.now();

  // Clear any pending reset timer
  const timer = batchTimers.get(userName);
  if (timer) clearTimeout(timer);

  // Start a new batch if none exists or the previous one expired
  if (existing == null) {
    batchTimestamps.set(userName, now);
  }

  // Reset the batch after 10s of inactivity
  batchTimers.set(
    userName,
    setTimeout(() => {
      batchTimestamps.delete(userName);
      batchTimers.delete(userName);
    }, BATCH_INTERVAL_MS),
  );

  return batchTimestamps.get(userName)!;
}

// Track attributions per user for each doc
function trackAttributions(
  trackedDoc: Y.Doc,
  userName: string,
  attributions: Y.Attributions,
) {
  trackedDoc.on(
    "update",
    (
      update: Uint8Array,
      _origin: unknown,
      _ydoc: Y.Doc,
      tr: { local: boolean },
    ) => {
      if (!tr.local) return;
      const contentIds = Y.createContentIdsFromUpdate(update);
      const timestamp = getBatchedTimestamp(userName);
      Y.insertIntoIdMap(
        attributions.inserts,
        Y.createIdMapFromIdSet(contentIds.inserts, [
          Y.createContentAttribute("insert", userName),
          Y.createContentAttribute("insertAt", timestamp),
        ]),
      );
      Y.insertIntoIdMap(
        attributions.deletes,
        Y.createIdMapFromIdSet(contentIds.deletes, [
          Y.createContentAttribute("delete", userName),
          Y.createContentAttribute("deleteAt", timestamp),
        ]),
      );
    },
  );
}

// Track local changes on each doc with a distinct user name
trackAttributions(doc, "Alice", attrs);
trackAttributions(doc2, "Bob", attrs);

const suggestingDoc = new Y.Doc({ isSuggestionDoc: true });
const suggestingProvider = {
  awareness: new Awareness(suggestingDoc),
};
suggestingProvider.awareness.setLocalStateField("user", {
  name: "Charlie",
  color: "#ffbc42",
});
const suggestingAttributionManager = Y.createAttributionManagerFromDiff(
  doc,
  suggestingDoc,
  { attrs },
);
suggestingAttributionManager.suggestionMode = false;

const suggestionModeDoc = new Y.Doc({ isSuggestionDoc: true });
const suggestionModeProvider = {
  awareness: new Awareness(suggestionModeDoc),
};
suggestionModeProvider.awareness.setLocalStateField("user", {
  name: "Debbie",
  color: "#ee6352",
});
const suggestionModeAttributionManager = Y.createAttributionManagerFromDiff(
  doc,
  suggestionModeDoc,
  { attrs },
);
suggestionModeAttributionManager.suggestionMode = true;

// Track local changes on suggestion docs with distinct user names
trackAttributions(suggestingDoc, "Charlie", attrs);
trackAttributions(suggestionModeDoc, "Debbie", attrs);

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
  userName,
  userColor,
}: {
  fragment: Y.Type;
  provider: { awareness?: Awareness };
  attributionManager?: Y.DiffAttributionManager;
  userName: string;
  userColor: string;
}) {
  const editor = useCreateBlockNote(
    withCollaboration({
      collaboration: {
        fragment,
        provider,
        attributionManager,
        user: { name: userName, color: userColor },
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
          Client A (Alice)
          <Editor
            fragment={doc.get("doc")}
            provider={provider}
            userName="Alice"
            userColor="#30bced"
          />
        </div>
        <div style={{ flex: 1 }}>
          Client B (Bob)
          <Editor
            fragment={doc2.get("doc")}
            provider={provider2}
            userName="Bob"
            userColor="#6eeb83"
          />
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
          View Suggestions (Charlie)
          <Editor
            fragment={suggestingDoc.get("doc")}
            provider={suggestingProvider}
            attributionManager={suggestingAttributionManager}
            userName="Charlie"
            userColor="#ffbc42"
          />
        </div>
        <div style={{ flex: 1 }}>
          Suggestion Mode (Debbie)
          <Editor
            fragment={suggestionModeDoc.get("doc")}
            provider={suggestionModeProvider}
            attributionManager={suggestionModeAttributionManager}
            userName="Debbie"
            userColor="#ee6352"
          />
        </div>
      </div>
    </div>
  );
}
