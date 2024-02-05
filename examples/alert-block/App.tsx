import { defaultBlockSpecs } from "@blocknote/core";
import {
  BlockNoteView,
  defaultBlockTypeDropdownItems,
  DefaultFormattingToolbar,
  FormattingToolbarPositioner,
  getDefaultReactSlashMenuItems,
  HyperlinkToolbarPositioner,
  ImageToolbarPositioner,
  SideMenuPositioner,
  SlashMenuPositioner,
  useBlockNote,
} from "@blocknote/react";
import "@blocknote/react/style.css";
import { RiAlertFill } from "react-icons/ri";

import { Alert, insertAlert } from "./Alert";

// Our block specs, which contain the configs and implementations for blocks
// that we want our editor to use.
const blockSpecsWithAlert = {
  // Adds all default blocks.
  ...defaultBlockSpecs,
  // Adds the font paragraph.
  alert: Alert,
};

export default function App() {
  // Creates a new editor instance.
  const editor = useBlockNote({
    // Tells BlockNote which blocks to use.
    blockSpecs: blockSpecsWithAlert,
    // Adds slash menu item to insert alert block.
    slashMenuItems: [...getDefaultReactSlashMenuItems(), insertAlert],
  });

  return (
    <BlockNoteView editor={editor}>
      {/*Adds alert item to block type dropdown in the Formatting Toolbar*/}
      <FormattingToolbarPositioner
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
      />
      {/*Other toolbars & menus are defaults*/}
      <HyperlinkToolbarPositioner editor={editor} />
      <SlashMenuPositioner editor={editor} />
      <SideMenuPositioner editor={editor} />
      <ImageToolbarPositioner editor={editor} />
    </BlockNoteView>
  );
}
