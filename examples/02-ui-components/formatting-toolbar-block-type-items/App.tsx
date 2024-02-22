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
  const editor = useCreateBlockNote({
    initialContent: [
      {
        type: "paragraph",
        content: "Welcome to this demo!",
      },
      {
        type: "paragraph",
        content:
          "Try selecting some text - you'll see the new 'Image' item in the Block Type Dropdown",
      },
      {
        type: "paragraph",
        content:
          "Or select the image below - the Block Type Dropdown now appears",
      },
      {
        type: "image",
        props: {
          url: "https://www.economist.com/cdn-cgi/image/width=1424,quality=80,format=auto/content-assets/images/20230708_STP001.jpg",
          width: 200,
        },
      },
      {
        type: "paragraph",
      },
    ],
  });

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
