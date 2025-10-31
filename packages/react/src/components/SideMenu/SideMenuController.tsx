import {
  BlockSchema,
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  InlineContentSchema,
  SideMenuProsemirrorPlugin,
  StyleSchema,
} from "@blocknote/core";
import { FC } from "react";

import { UseFloatingOptions } from "@floating-ui/react";
import { useBlockNoteEditor } from "../../hooks/useBlockNoteEditor.js";
import { useUIElementPositioning } from "../../hooks/useUIElementPositioning.js";
import { SideMenu } from "./SideMenu.js";
import { SideMenuProps } from "./SideMenuProps.js";
import { usePlugin, usePluginState } from "../../hooks/usePlugin.js";

export const SideMenuController = <
  BSchema extends BlockSchema = DefaultBlockSchema,
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema,
>(props: {
  sideMenu?: FC<SideMenuProps<BSchema, I, S>>;
  floatingOptions?: Partial<UseFloatingOptions>;
}) => {
  const editor = useBlockNoteEditor<BSchema, I, S>();
  const sideMenu = usePlugin(SideMenuProsemirrorPlugin);

  const callbacks = {
    blockDragStart: sideMenu.blockDragStart,
    blockDragEnd: sideMenu.blockDragEnd,
    freezeMenu: sideMenu.freezeMenu,
    unfreezeMenu: sideMenu.unfreezeMenu,
  };

  // TODO refactor this to use a hook for positioning to a block
  const state = usePluginState(SideMenuProsemirrorPlugin);
  const { isMounted, ref, style, getFloatingProps } = useUIElementPositioning(
    state?.show || false,
    state?.referencePos || null,
    1000,
    {
      placement: "left-start",
      ...props.floatingOptions,
    },
  );

  if (!isMounted || !state) {
    return null;
  }

  const { show, referencePos, ...data } = state;

  const Component = props.sideMenu || SideMenu;

  return (
    <div ref={ref} style={style} {...getFloatingProps()}>
      <Component {...data} {...callbacks} editor={editor} />
    </div>
  );
};
