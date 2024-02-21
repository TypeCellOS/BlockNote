import {
  BlockNoteView,
  BlockTypeDropdownItem,
  blockTypeDropdownItems,
  FormattingToolbar,
  FormattingToolbarController,
  useBlockNote,
} from "@blocknote/react";
import "@blocknote/react/style.css";
import { RiImage2Fill } from "react-icons/ri";

export default function App() {
  // Creates a new editor instance.
  const editor = useBlockNote();

  // Renders the editor instance.
  return (
    <BlockNoteView editor={editor} formattingToolbar={false}>
      <FormattingToolbarController
        formattingToolbar={() => (
          <FormattingToolbar
            blockTypeDropdownItems={[
              ...blockTypeDropdownItems,
              {
                name: "Image",
                type: "image",
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
