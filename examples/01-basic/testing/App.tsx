import {
  BlockNoteSchema,
  defaultBlockSpecs,
  uploadToTmpFilesDotOrg_DEV_ONLY,
} from "@blocknote/core";
import "@blocknote/core/fonts/inter.css";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import {
  ReactAudioBlock,
  ReactImageBlock,
  ReactVideoBlock,
  useCreateBlockNote,
} from "@blocknote/react";

const schema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
    image: ReactImageBlock,
    video: ReactVideoBlock,
    audio: ReactAudioBlock,
  },
});

export default function App() {
  // Creates a new editor instance.
  const editor = useCreateBlockNote({
    uploadFile: uploadToTmpFilesDotOrg_DEV_ONLY,
    // schema,
  });

  // Renders the editor instance using a React component.
  return <BlockNoteView editor={editor} />;
}
