import "@blocknote/core/fonts/inter.css";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import {
  BlockColorsItem,
  DragHandleMenu,
  DragHandleMenuProps,
  RemoveBlockItem,
  SideMenu,
  SideMenuController,
  useCreateBlockNote,
} from "@blocknote/react";

import { ResetBlockTypeItem } from "./ResetBlockTypeItem";

// To avoid rendering issues, it's good practice to define your custom drag
// handle menu in a separate component, instead of inline within the `sideMenu`
// prop of `SideMenuController`.
const CustomDragHandleMenu = (props: DragHandleMenuProps) => (
  <DragHandleMenu {...props}>
    <RemoveBlockItem {...props}>Delete</RemoveBlockItem>
    <BlockColorsItem {...props}>Colors</BlockColorsItem>
    {/* Item which resets the hovered block's type. */}
    <ResetBlockTypeItem {...props}>Reset Type</ResetBlockTypeItem>
  </DragHandleMenu>
);

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
        content: "<- Click the Drag Handle to see the new item",
      },
      {
        type: "bulletListItem",
        content:
          "Try resetting this block's type using the new Drag Handle Menu item",
      },
      {
        type: "paragraph",
      },
    ],
  });

  // Renders the editor instance.
  return (
    <BlockNoteView editor={editor} sideMenu={false}>
      <SideMenuController
        sideMenu={(props) => (
          <SideMenu {...props} dragHandleMenu={CustomDragHandleMenu} />
        )}
      />
    </BlockNoteView>
  );
}
