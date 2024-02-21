import {
  BlockNoteView,
  BlockTypeDropdownItem,
  blockTypeDropdownItems,
  FormattingToolbar,
  FormattingToolbarController,
  useBlockNote,
} from "@blocknote/react";
import "@blocknote/react/style.css";

// TODO: Fix
export default function App() {
  // Creates a new editor instance.
  const editor = useBlockNote();

  // Renders the editor instance.
  return (
    <BlockNoteView editor={editor} formattingToolbar={false}>
      <FormattingToolbarController
        formattingToolbar={() => (
          <FormattingToolbar
            blockTypeDropdownItems={() => [
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
