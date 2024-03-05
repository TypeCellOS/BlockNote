import {
  BlockSchema,
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { FC } from "react";

import { useBlockNoteEditor } from "../../hooks/useBlockNoteEditor";
import { useUIElementPositioning } from "../../hooks/useUIElementPositioning";
import { useUIPluginState } from "../../hooks/useUIPluginState";
import { SideMenuProps } from "./SideMenuProps";
import { SideMenu } from "./mantine/SideMenu";

export const SideMenuController = <
  BSchema extends BlockSchema = DefaultBlockSchema,
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema
>(props: {
  sideMenu?: FC<SideMenuProps<BSchema, I, S>>;
}) => {
  const editor = useBlockNoteEditor<BSchema, I, S>();

  const callbacks = {
    addBlock: editor.sideMenu.addBlock,
    blockDragStart: editor.sideMenu.blockDragStart,
    blockDragEnd: editor.sideMenu.blockDragEnd,
    freezeMenu: editor.sideMenu.freezeMenu,
    unfreezeMenu: editor.sideMenu.unfreezeMenu,
  };

  const state = useUIPluginState(
    editor.sideMenu.onUpdate.bind(editor.sideMenu)
  );
  const { isMounted, ref, style } = useUIElementPositioning(
    state?.show || false,
    state?.referencePos || null,
    1000,
    {
      placement: "left",
    }
  );

  if (!isMounted || !state) {
    return null;
  }

  const { show, referencePos, ...data } = state;

  const Component = props.sideMenu || SideMenu;

  return (
    <div ref={ref} style={style}>
      <Component {...data} {...callbacks} />
    </div>
  );
};
