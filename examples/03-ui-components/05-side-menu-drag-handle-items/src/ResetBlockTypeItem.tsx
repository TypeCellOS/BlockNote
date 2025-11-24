import {} from "@blocknote/core";
import { SideMenuExtension } from "@blocknote/core/extensions";
import {
  useBlockNoteEditor,
  useComponentsContext,
  useExtension,
} from "@blocknote/react";
import { ReactNode } from "react";

export function ResetBlockTypeItem(props: { children: ReactNode }) {
  const editor = useBlockNoteEditor();

  const Components = useComponentsContext()!;

  const sideMenu = useExtension(SideMenuExtension);

  return (
    <Components.Generic.Menu.Item
      onClick={() => {
        editor.updateBlock(sideMenu.store.state!.block, { type: "paragraph" });
      }}
    >
      {props.children}
    </Components.Generic.Menu.Item>
  );
}
