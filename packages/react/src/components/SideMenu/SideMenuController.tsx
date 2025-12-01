import { SideMenuExtension } from "@blocknote/core/extensions";
import { FC, useMemo } from "react";

import { useExtensionState } from "../../hooks/useExtension.js";
import { BlockPopover } from "../Popovers/BlockPopover.js";
import { FloatingUIOptions } from "../Popovers/FloatingUIOptions.js";
import { SideMenu } from "./SideMenu.js";
import { SideMenuProps } from "./SideMenuProps.js";

export const SideMenuController = (props: {
  sideMenu?: FC<SideMenuProps>;
  floatingUIOptions?: Partial<FloatingUIOptions>;
}) => {
  const state = useExtensionState(SideMenuExtension, {
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
      elementProps: {
        style: {
          zIndex: 20,
        },
      },
      ...props.floatingUIOptions,
    }),
    [props.floatingUIOptions, show],
  );

  const Component = props.sideMenu || SideMenu;

  return (
    <BlockPopover blockId={show ? block?.id : undefined} {...floatingUIOptions}>
      {block?.id && <Component />}
    </BlockPopover>
  );
};
