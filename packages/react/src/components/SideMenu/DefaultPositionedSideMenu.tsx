import {
  BlockNoteEditor,
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

export const DefaultPositionedSideMenu = <
  BSchema extends BlockSchema = DefaultBlockSchema,
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema
>(props: {
  editor: BlockNoteEditor<BSchema, I, S>;
  sideMenu?: FC<SideMenuProps<BSchema, I, S>>;
}) => {
  const callbacks = {
    addBlock: props.editor.sideMenu.addBlock,
    blockDragStart: props.editor.sideMenu.blockDragStart,
    blockDragEnd: props.editor.sideMenu.blockDragEnd,
    freezeMenu: props.editor.sideMenu.freezeMenu,
    unfreezeMenu: props.editor.sideMenu.unfreezeMenu,
  };

  const state = useUIPluginState(
    props.editor.sideMenu.onUpdate.bind(props.editor.sideMenu)
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
      <SideMenu editor={props.editor} {...data} {...callbacks} />
    </div>
  );
};
