import { SideMenu } from "@blocknote/core/extensions";
import { ReactNode } from "react";

import { useComponentsContext } from "../../../../editor/ComponentsContext.js";
import { useBlockNoteEditor } from "../../../../hooks/useBlockNoteEditor.js";
import { usePluginState } from "../../../../hooks/usePlugin.js";

export const RemoveBlockItem = (props: { children: ReactNode }) => {
  const Components = useComponentsContext()!;

  const editor = useBlockNoteEditor<any, any, any>();

  const block = usePluginState(SideMenu, {
    editor,
    selector: (state) => state?.block,
  });

  if (block === undefined) {
    return null;
  }

  return (
    <Components.Generic.Menu.Item
      className={"bn-menu-item"}
      onClick={() => editor.removeBlocks([block])}
    >
      {props.children}
    </Components.Generic.Menu.Item>
  );
};
