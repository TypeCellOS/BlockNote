import "@blocknote/core/fonts/inter.css";
// Brings in BlockNote's styles INCLUDING the attribution rendering
// (insert = green, delete = red strike-through, format = amber, attributed
// variant blocks get an accent bar). See packages/core/src/editor/attribution.css.
import "@blocknote/core/style.css";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { acceptAllChanges, rejectAllChanges } from "@blocknote/core";
import { useCreateBlockNote } from "@blocknote/react";
import { Awareness } from "@y/protocols/awareness";
import * as Y from "@y/y";
import { useRef } from "react";

/**
 * Attribution demo.
 *
 * - `doc` is the shared, committed document. "Client A" and "Client B" bind to
 *   the SAME Y.Doc, so they collaborate in real time (no provider needed).
 * - `viewDoc` / `suggestionDoc` are derived from `doc` via
 *   `DiffAttributionManager`s. Their AMs are created while every doc is still
 *   empty, so the base document forwards into them as *committed* (un-attributed)
 *   content - and they never independently `createAndFill` (which would merge to
 *   two blockGroups, invalid for BlockNote's `doc: "blockGroup"`).
 * - "Suggestion Mode": edits here stay as suggestions (suggestionMode = true).
 * - "Review": sees the suggestions (suggestionMode = false). Accepting commits
 *   them into the base document for everyone; rejecting discards them.
 */
const doc = new Y.Doc();
const awarenessA = new Awareness(doc);
const awarenessB = new Awareness(doc);

const attrs = new Y.Attributions();

const viewDoc = new Y.Doc({ isSuggestionDoc: true });
const viewAwareness = new Awareness(viewDoc);
const viewAM = Y.createAttributionManagerFromDiff(doc, viewDoc, { attrs });
viewAM.suggestionMode = false;

const suggestionDoc = new Y.Doc({ isSuggestionDoc: true });
const suggestionAwareness = new Awareness(suggestionDoc);
const suggestionAM = Y.createAttributionManagerFromDiff(doc, suggestionDoc, {
  attrs,
});
suggestionAM.suggestionMode = true;

// Keep the two suggestion documents in sync so "Review" sees what "Suggestion
// Mode" produces (and vice-versa).
function syncTwoWay(a: Y.Doc, b: Y.Doc) {
  Y.applyUpdate(b, Y.encodeStateAsUpdate(a));
  Y.applyUpdate(a, Y.encodeStateAsUpdate(b));
  a.on("update", (u: Uint8Array) => Y.applyUpdate(b, u));
  b.on("update", (u: Uint8Array) => Y.applyUpdate(a, u));
}
syncTwoWay(viewDoc, suggestionDoc);

function Editor(props: {
  fragment: Y.Type;
  awareness: Awareness;
  attributionManager?: Y.AbstractAttributionManager;
  user: { name: string; color: string };
  editorRef?: React.MutableRefObject<any>;
}) {
  const editor = useCreateBlockNote({
    collaboration: {
      fragment: props.fragment as any,
      provider: { awareness: props.awareness },
      user: props.user,
      attributionManager: props.attributionManager,
    },
  });
  if (props.editorRef) {
    props.editorRef.current = editor;
  }
  return <BlockNoteView editor={editor} />;
}

const panel: React.CSSProperties = {
  flex: 1,
  border: "1px solid #e0e0e0",
  borderRadius: 8,
  padding: 8,
  minWidth: 0,
};
const heading: React.CSSProperties = {
  fontFamily: "sans-serif",
  fontSize: 13,
  fontWeight: 600,
  marginBottom: 6,
  display: "flex",
  alignItems: "center",
  gap: 8,
};

export default function App() {
  const reviewRef = useRef<any>(null);

  const run = (cmd: typeof acceptAllChanges) => () => {
    const view = reviewRef.current?.prosemirrorView;
    if (view) {
      cmd()(view.state, (tr: any) => view.dispatch(tr));
    }
  };

  return (
    <div style={{ maxWidth: 1100, margin: "16px auto", fontFamily: "sans-serif" }}>
      <h2>BlockNote attribution / suggestion mode</h2>
      <p style={{ color: "#555", fontSize: 14 }}>
        Type in <b>Suggestion Mode</b> - your edits show up as tracked
        suggestions (green = inserted, red strike-through = deleted) in{" "}
        <b>Review</b>. Click <b>Accept all</b> to merge them into the shared
        document (Client A &amp; B), or <b>Reject all</b> to discard them.
      </p>

      <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
        <div style={panel}>
          <div style={heading}>Client A (shared document)</div>
          <Editor
            fragment={doc.get("doc")}
            awareness={awarenessA}
            user={{ name: "Alice", color: "#2e86de" }}
          />
        </div>
        <div style={panel}>
          <div style={heading}>Client B (shared document)</div>
          <Editor
            fragment={doc.get("doc")}
            awareness={awarenessB}
            user={{ name: "Bob", color: "#8e44ad" }}
          />
        </div>
      </div>

      <div style={{ display: "flex", gap: 12 }}>
        <div style={panel}>
          <div style={heading}>
            Review (view suggestions)
            <button onClick={run(acceptAllChanges)}>Accept all</button>
            <button onClick={run(rejectAllChanges)}>Reject all</button>
          </div>
          <Editor
            fragment={viewDoc.get("doc")}
            awareness={viewAwareness}
            attributionManager={viewAM}
            user={{ name: "Reviewer", color: "#16a085" }}
            editorRef={reviewRef}
          />
        </div>
        <div style={panel}>
          <div style={heading}>Suggestion Mode (your edits become suggestions)</div>
          <Editor
            fragment={suggestionDoc.get("doc")}
            awareness={suggestionAwareness}
            attributionManager={suggestionAM}
            user={{ name: "Suggester", color: "#e67e22" }}
          />
        </div>
      </div>
    </div>
  );
}
