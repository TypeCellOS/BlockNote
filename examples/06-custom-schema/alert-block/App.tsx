import { BlockNoteSchema, defaultBlockSpecs } from "@blocknote/core";
import { BlockNoteView, useCreateBlockNote } from "@blocknote/react";
import "@blocknote/react/style.css";

import { Alert } from "./Alert";

// Our schema with block specs, which contain the configs and implementations for blocks
// that we want our editor to use.
const schema = BlockNoteSchema.create({
  blockSpecs: {
    // Adds all default blocks.
    ...defaultBlockSpecs,
    // Adds the font paragraph.
    alert: Alert,
  },
});

export default function App() {
  // Creates a new editor instance.
  const editor = useCreateBlockNote({
    schema,

    // Adds slash menu item to insert alert block.
    // slashMenuItems: [...getDefaultReactSlashMenuItems(), insertAlert], TODO
  });

  return (
    <BlockNoteView editor={editor}>
      {/*Adds alert item to block type dropdown in the Formatting Toolbar*/}
      {/* TODO */}
      {/* <FormattingToolbarPositioner
        editor={editor}
        formattingToolbar={(props) => (
          <DefaultFormattingToolbar
            {...props}
            blockTypeDropdownItems={[
              ...defaultBlockTypeDropdownItems,
              {
                name: "Alert",
                type: "alert",
                icon: RiAlertFill,
                isSelected: (block) => block.type === "alert",
              },
            ]}
          />
        )}
      /> */}
      {/*Other toolbars & menus are defaults*/}

      {/* <HyperlinkToolbarPositioner editor={editor} />
      <SlashMenuPositioner editor={editor} />
      <SideMenuPositioner editor={editor} />
      <ImageToolbarPositioner editor={editor} /> */}
    </BlockNoteView>
  );
}
