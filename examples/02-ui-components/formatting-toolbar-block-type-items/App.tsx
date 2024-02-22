import {
  BlockNoteView,
  BlockTypeDropdownItem,
  blockTypeDropdownItems,
  FormattingToolbar,
  FormattingToolbarController,
  useCreateBlockNote,
} from "@blocknote/react";
import "@blocknote/react/style.css";
import { RiImage2Fill } from "react-icons/ri";

export default function App() {
  // Creates a new editor instance.
  const editor = useCreateBlockNote();

  // Renders the editor instance.
  return (
    <BlockNoteView editor={editor} formattingToolbar={false}>
      <FormattingToolbarController
        formattingToolbar={() => (
          <FormattingToolbar
            blockTypeDropdownItems={[
              ...blockTypeDropdownItems,
              {
                name: "Specific Image",
                type: "image",
                props: {
                  src: "TODO",
                  alt: "image",
                },
                icon: RiImage2Fill,
                isSelected: (block) => block.type === "image",
              } satisfies BlockTypeDropdownItem,
            ]}
          />
        )}
      />
    </BlockNoteView>
  );
}
