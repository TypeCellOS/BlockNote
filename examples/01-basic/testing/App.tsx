import {
  BlockNoteSchema,
  defaultBlockSpecs,
  uploadToTmpFilesDotOrg_DEV_ONLY,
} from "@blocknote/core";
import "@blocknote/core/fonts/inter.css";
import {
  createReactFileBlock,
  defaultReactFileExtensions,
  useCreateBlockNote,
} from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";

const schema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
    file: createReactFileBlock(defaultReactFileExtensions),
  },
});

export default function App() {
  // Creates a new editor instance.
  const editor = useCreateBlockNote({
    uploadFile: uploadToTmpFilesDotOrg_DEV_ONLY,
    schema,
  });

  // Renders the editor instance using a React component.
  return <BlockNoteView editor={editor} />;
}
