import {
  BlockSchema,
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { FC } from "react";

import { useUIPluginState } from "../../hooks/useUIPluginState";
import { useUIElementPositioning } from "../../hooks/useUIElementPositioning";
import { DefaultSideMenu, SideMenuProps } from "./DefaultSideMenu";
import { useBlockNoteEditor } from "../../editor/BlockNoteContext";

export const DefaultPositionedSideMenu = <
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

  const SideMenu = props.sideMenu || DefaultSideMenu;

  return (
    <div ref={ref} style={style}>
      <SideMenu {...data} {...callbacks} />
    </div>
  );
};
