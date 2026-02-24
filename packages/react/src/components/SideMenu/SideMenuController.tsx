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
      ...props.floatingUIOptions,
      useFloatingOptions: {
        open: show,
        placement: "left-start",
        ...props.floatingUIOptions?.useFloatingOptions,
      },
      useDismissProps: {
        enabled: false,
        ...props.floatingUIOptions?.useDismissProps,
      },
      focusManagerProps: {
        disabled: true,
        ...props.floatingUIOptions?.focusManagerProps,
      },
      elementProps: {
        style: {
          zIndex: 20,
        },
        ...props.floatingUIOptions?.elementProps,
      },
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
