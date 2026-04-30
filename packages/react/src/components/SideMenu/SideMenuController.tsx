import { SideMenuExtension } from "@blocknote/core/extensions";
import {
  autoUpdate,
  offset,
  OffsetOptions,
  ReferenceElement,
} from "@floating-ui/react";
import { FC, useCallback, useMemo } from "react";

import { useBlockNoteEditor } from "../../hooks/useBlockNoteEditor.js";
import { useExtensionState } from "../../hooks/useExtension.js";
import { BlockPopover } from "../Popovers/BlockPopover.js";
import { FloatingUIOptions } from "../Popovers/FloatingUIOptions.js";
import { SideMenu } from "./SideMenu.js";
import { SideMenuProps } from "./SideMenuProps.js";

/**
 * Pass to Floating UI's `offset` middleware to keep the side menu aligned
 * with table blocks:
 *   middleware: [offset(tableWrapperOffset), ...other]
 *
 * Compensates for the top padding on `.tableWrapper` (the in-block container
 * that reserves space for row/column handles) — without this, the side menu
 * floats above the visible top of the table.
 *
 * Only active for left/right placements (where `crossAxis` maps to vertical).
 * Returns 0 for top/bottom placements to avoid horizontal misalignment if the
 * export is reused outside its intended placement context.
 *
 * Note on composition: this is added unconditionally by `SideMenuController`.
 * Consumer-supplied middleware is appended after, so any additional `offset(...)`
 * from a consumer stacks with this one (Floating UI's offset middlewares are
 * additive). For non-table blocks `tableWrapperOffset` returns 0, so the stack
 * is a no-op there; for table blocks the compensation always applies.
 */
export const tableWrapperOffset: OffsetOptions = (state) => {
  const side = state.placement.split("-")[0];
  if (side !== "left" && side !== "right") {
    return 0;
  }
  const { reference } = state.elements;
  const refEl =
    reference instanceof Element ? reference : reference.contextElement;
  // The side menu's reference is the block's outer `.bn-block` element.
  // For tables, the `.tableWrapper` lives one level deeper inside
  // `.bn-block-content`. Match that exact path so unrelated descendants
  // (e.g. a nested table inside a multi-column block) don't trigger.
  const wrapper = refEl?.querySelector(
    ":scope > .bn-block-content > .tableWrapper",
  );
  if (!wrapper) {
    return 0;
  }
  const padding = parseFloat(getComputedStyle(wrapper).paddingTop);
  return padding > 0 ? { mainAxis: 0, crossAxis: padding } : 0;
};

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
        middleware: [
          offset(tableWrapperOffset),
          ...(props.floatingUIOptions?.useFloatingOptions?.middleware ?? []),
        ],
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
