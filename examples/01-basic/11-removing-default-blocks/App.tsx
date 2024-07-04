import "@blocknote/core/fonts/inter.css";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { BlockNoteSchema, BlockSpec, defaultBlockSpecs, defaultInlineContentSpecs,  defaultStyleSpecs } from "@blocknote/core";

export default function App() {

  // create the schema
  const schema = BlockNoteSchema.create({
    blockSpecs: {
      //first pass all the blocks
      ...defaultBlockSpecs,
      //now make the unwanted blocks undefined
      audio: undefined as any,
      image: undefined as any
    },
    inlineContentSpecs: {
      // enable the default inline content if desired
      ...defaultInlineContentSpecs,
   
      // Add your own custom inline content:
      // customInlineContent: CustomInlineContent,
    },
    styleSpecs: {
      // enable the default styles if desired
      ...defaultStyleSpecs,
   
      // Add your own custom styles:
      // customStyle: CustomStyle
    },
  });

  // Creates a new editor instance.
  const editor = useCreateBlockNote({
    schema
  });

  // Renders the editor instance using a React component.
  return <BlockNoteView editor={editor} />;
}