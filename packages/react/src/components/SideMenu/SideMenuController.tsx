import { SideMenuProsemirrorPlugin } from "@blocknote/core";
import { FC, useEffect, useMemo, useState } from "react";

import { usePluginState } from "../../hooks/usePlugin.js";
import { BlockPopover } from "../Popovers/BlockPopover.js";
import { FloatingUIOptions } from "../Popovers/FloatingUIOptions.js";
import { SideMenu } from "./SideMenu.js";
import { SideMenuProps } from "./SideMenuProps.js";

export const SideMenuController = (props: {
  sideMenu?: FC<SideMenuProps>;
  floatingUIOptions?: Partial<FloatingUIOptions>;
}) => {
  const [open, setOpen] = useState(false);

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
  useEffect(() => {
    setOpen(!!show);
  }, [show]);

  const floatingUIOptions = useMemo<FloatingUIOptions>(
    () => ({
      useFloatingOptions: {
        open,
        onOpenChange: setOpen,
        placement: "left-start",
      },
      ...props.floatingUIOptions,
    }),
    [open, props.floatingUIOptions],
  );

  const Component = props.sideMenu || SideMenu;

  return (
    <BlockPopover blockId={block?.id} {...floatingUIOptions}>
      <Component />
    </BlockPopover>
  );
};
