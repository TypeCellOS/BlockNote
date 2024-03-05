import { defaultBlockSchema, defaultBlockSpecs } from "@blocknote/core";
import "@blocknote/core/style.css";
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
import { RiAlertFill } from "react-icons/ri";

import { Alert, insertAlert } from "./Alert";

// The custom schema, including all default blocks and the custom Alert block
export const blockSpecsWithAlert = {
  ...defaultBlockSpecs,
  alert: Alert,
};
export const blockSchemaWithAlert = {
  ...defaultBlockSchema,
  alert: Alert.config,
};

export default function App() {
  const editor = useBlockNote({
    blockSpecs: blockSpecsWithAlert,
    slashMenuItems: [
      ...getDefaultReactSlashMenuItems(blockSchemaWithAlert),
      insertAlert,
    ],
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
