import "@blocknote/core/fonts/inter.css";
import {
  BlockColorsItem,
  DragHandleMenu,
  RemoveBlockItem,
  SideMenu,
  SideMenuController,
  useComponentsContext,
  useCreateBlockNote,
} from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";

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

  const Components = useComponentsContext()!;

  // Renders the editor instance.
  return (
    <BlockNoteView editor={editor} sideMenu={false}>
      <SideMenuController
        sideMenu={(props) => (
          <SideMenu
            {...props}
            dragHandleMenu={(props) => (
              <DragHandleMenu {...props}>
                <RemoveBlockItem {...props}>Delete</RemoveBlockItem>
                <BlockColorsItem {...props}>Colors</BlockColorsItem>
                {/* Item which resets the hovered block's type. */}
                <Components.Generic.Menu.Item
                  onClick={() => {
                    editor.updateBlock(props.block, { type: "paragraph" });
                  }}>
                  Reset Type
                </Components.Generic.Menu.Item>
              </DragHandleMenu>
            )}
          />
        )}
      />
    </BlockNoteView>
  );
}
