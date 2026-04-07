import { SideMenuExtension } from "@blocknote/core/extensions";
import { autoUpdate, ReferenceElement } from "@floating-ui/react";
import { FC, useCallback, useMemo } from "react";

import { useBlockNoteEditor } from "../../hooks/useBlockNoteEditor.js";
import { useExtensionState } from "../../hooks/useExtension.js";
import { BlockPopover } from "../Popovers/BlockPopover.js";
import { FloatingUIOptions } from "../Popovers/FloatingUIOptions.js";
import { SideMenu } from "./SideMenu.js";
import { SideMenuProps } from "./SideMenuProps.js";

export const SideMenuController = (props: {
  sideMenu?: FC<SideMenuProps>;
  floatingUIOptions?: Partial<FloatingUIOptions>;
}) => {
  const editor = useBlockNoteEditor();
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

  // Hides the side menu on ancestor scroll so it doesn't overflow outside
  // the editor's scroll container.
  const whileElementsMounted = useCallback(
    (
      reference: ReferenceElement,
      floating: HTMLElement,
      _update: () => void,
    ) => {
      let initialized = false;
      return autoUpdate(
        reference,
        floating,
        () => {
          if (!initialized) {
            // autoUpdate calls this function once when the floating element is mounted
            // we don't want to hide the menu in that case
            initialized = true;
            return;
          }
          editor.getExtension(SideMenuExtension)?.hideMenuIfNotFrozen();
        },
        {
          ancestorScroll: true,
          ancestorResize: false,
          elementResize: false,
          layoutShift: false,
        },
      );
    },
    [editor],
  );

  const floatingUIOptions = useMemo<FloatingUIOptions>(
    () => ({
      ...props.floatingUIOptions,
      useFloatingOptions: {
        open: show,
        placement: "left-start",
        whileElementsMounted,
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
    [props.floatingUIOptions, show, whileElementsMounted],
  );

  const Component = props.sideMenu || SideMenu;

  return (
    <BlockPopover blockId={show ? block?.id : undefined} {...floatingUIOptions}>
      {block?.id && <Component />}
    </BlockPopover>
  );
};
