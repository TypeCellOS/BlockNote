import {} from "@blocknote/core";
import { SideMenuExtension } from "@blocknote/core/extensions";
import {
  useBlockNoteEditor,
  useComponentsContext,
  useExtensionState,
} from "@blocknote/react";
import { ReactNode } from "react";

export function ResetBlockTypeItem(props: { children: ReactNode }) {
  const editor = useBlockNoteEditor();

  const Components = useComponentsContext()!;

  const block = useExtensionState(SideMenuExtension, {
    selector: (state) => state?.block,
  });

  if (!block) {
    return null;
  }

  return (
    <Components.Generic.Menu.Item
      onClick={() => {
        editor.updateBlock(block, { type: "paragraph" });
      }}
    >
      {props.children}
    </Components.Generic.Menu.Item>
  );
}
