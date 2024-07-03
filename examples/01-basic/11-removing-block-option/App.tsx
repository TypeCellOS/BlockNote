import "@blocknote/core/fonts/inter.css";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { BlockNoteSchema, defaultBlockSpecs, defaultInlineContentSpecs,  defaultStyleSpecs } from "@blocknote/core";

export default function App() {
  //create custom schema
  let editedSchema : any =  {}

  //define the blocks which are not allowed
  const unwantedBlocks = ['audio', 'image']

  //Loop thru default schema and remove the unwanted blocks
  Object.entries(defaultBlockSpecs).forEach(([blockName, blockSchema])=>{
    if(!unwantedBlocks.includes(blockName)){

      //only allow to to pass if the blockName is not unwanted
      editedSchema[blockName] = blockSchema
    }
  })

  //now create the schema
  const schema = BlockNoteSchema.create({
    blockSpecs: {
      ...editedSchema,
   
      // Add your own custom blocks:
      // customBlock: CustomBlock,
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