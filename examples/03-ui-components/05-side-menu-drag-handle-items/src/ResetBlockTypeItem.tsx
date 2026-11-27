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
    selector: (state) => (state ? editor.getBlock(state.blockId) : undefined),
  });

  if (block === undefined) {
    return null;
  }

  return (
    <Components.Generic.Menu.Item
      onClick={() => {
        if (editor.getBlock(block.id)) {
          editor.updateBlock(block.id, { type: "paragraph" });
        }
      }}
    >
      {props.children}
    </Components.Generic.Menu.Item>
  );
}
