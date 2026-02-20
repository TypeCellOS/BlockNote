export const codeSamples = {
  // FeatureDX: "Bring your Design System"
  theming: `import { useCreateBlockNote } from "@blocknote/react";
import { ShadCNComponents } from "@blocknote/shadcn";

const editor = useCreateBlockNote();

return (
  <BlockNoteView
    editor={editor}
    theme="light"
    // Use built-in components or your own
    components={ShadCNComponents}
  />
);`,
  // TODO: need to get twoslash working, for now using screenshot
  // FeatureDX: "Type-Safe"
  //   types: `const BlockNoteSchema: any = {};
  // // Define your custom block schema
  // const schema = BlockNoteSchema.create({
  //   blockSpecs: {
  //     // ...
  //   },
  // });

  // // Full type inference for your blocks
  // type MyBlock = typeof schema.Block;
  // //   ^?`,

  // FeatureDX: "Extend Everything"
  extend: `import { createReactBlockSpec } from "@blocknote/react";

// Create custom blocks with React
export const AlertBlock = createReactBlockSpec({
  type: "alert",
  propSchema: {
    type: { default: "warning" },
  },
  content: "inline",
}, {
  render: (props) => (
    <div className="alert">
      {props.contentRef}
    </div>
  ),
});`,

  // FeatureCollab: "Real-time Sync"
  realtime: `import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";

const doc = new Y.Doc();
const provider = new WebsocketProvider(
  "ws://localhost:1234", "room-id", doc);

const editor = useCreateBlockNote({
  collaboration: {
    fragment: doc.getXmlFragment("document"),
    user: { name: "Alice", color: "#ff0000" },
    provider,
  }
});

// Cursors and presence included`,
};
