import { SideMenu } from "@blocknote/core";
import {
  useBlockNoteEditor,
  useComponentsContext,
  usePlugin,
} from "@blocknote/react";
import { ReactNode } from "react";

export function ResetBlockTypeItem(props: { children: ReactNode }) {
  const editor = useBlockNoteEditor();

  const Components = useComponentsContext()!;

  const sideMenu = usePlugin(SideMenu);

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
