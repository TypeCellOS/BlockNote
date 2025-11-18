import { SideMenuProsemirrorPlugin } from "@blocknote/core";
import { FC, useMemo } from "react";

import { usePluginState } from "../../hooks/usePlugin.js";
import { BlockPopover } from "../Popovers/BlockPopover.js";
import { FloatingUIOptions } from "../Popovers/FloatingUIOptions.js";
import { SideMenu } from "./SideMenu.js";
import { SideMenuProps } from "./SideMenuProps.js";

export const SideMenuController = (props: {
  sideMenu?: FC<SideMenuProps>;
  floatingUIOptions?: Partial<FloatingUIOptions>;
}) => {
  const state = usePluginState(SideMenuProsemirrorPlugin, {
    selector: (state) => {
      return state !== undefined
        ? {
            show: state.show,
            block: state.block,
          }
        : undefined;
    },
  });

  const { show, block } = state || {};

  const floatingUIOptions = useMemo<FloatingUIOptions>(
    () => ({
      useFloatingOptions: {
        open: show,
        placement: "left-start",
      },
      useDismissProps: {
        enabled: false,
      },
      ...props.floatingUIOptions,
    }),
    [props.floatingUIOptions, show],
  );

  const Component = props.sideMenu || SideMenu;

  return (
    <BlockPopover blockId={block?.id} {...floatingUIOptions}>
      <Component />
    </BlockPopover>
  );
};
