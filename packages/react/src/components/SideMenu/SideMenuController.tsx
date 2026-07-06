import { Block, BlockNoteEditor } from "@blocknote/core";
import { SideMenuExtension } from "@blocknote/core/extensions";
import { autoUpdate, offset, ReferenceElement } from "@floating-ui/react";
import { FC, useCallback, useMemo } from "react";

import { useBlockNoteEditor } from "../../hooks/useBlockNoteEditor.js";
import { useExtensionState } from "../../hooks/useExtension.js";
import { BlockPopover } from "../Popovers/BlockPopover.js";
import { FloatingUIOptions } from "../Popovers/FloatingUIOptions.js";
import { SideMenu } from "./SideMenu.js";
import { SideMenuProps } from "./SideMenuProps.js";

// Returns the vertical offset of the side menu for the given block. Blocks
// whose first line is taller than the side menu need the menu shifted down to
// stay vertically centered on that line. This is done with a position offset
// instead of stretching the menu element to the first line's height, as the
// taller (invisible) element would block mouse interactions with content
// rendered next to the block, e.g. the column resize borders.
function getBlockOffset(
  editor: BlockNoteEditor<any, any, any>,
  block: Block<any, any, any>,
): number {
  if (block.type === "heading") {
    switch (block.props.level) {
      case 1:
        return 39;
      case 2:
        return 27;
      case 3:
        return 18.5;
      default:
        return 0;
    }
  }

  // File blocks without a URL all render the same "Add file" button,
  // regardless of their type.
  if (
    editor.schema.blockSpecs[block.type]?.implementation.meta
      ?.fileBlockAccept &&
    !block.props.url
  ) {
    return 12;
  }

  if (block.type === "file") {
    return 4;
  }

  if (block.type === "audio" || block.type === "table") {
    return 15;
  }

  return 0;
}

export const SideMenuController = (props: {
  sideMenu?: FC<SideMenuProps>;
  floatingUIOptions?: Partial<FloatingUIOptions>;
  /**
   * Override the DOM node this floating element portals into. Falls back to
   * `editor.portalElement` (which by default is mounted inside `bn-container`)
   * when omitted.
   */
  portalElement?: HTMLElement | null;
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
        // Vertically centers the menu on the block's first line. On the
        // "left-start" placement, the cross axis is the vertical one.
        middleware: [
          offset({
            crossAxis: block ? getBlockOffset(editor, block) : 0,
          }),
        ],
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
    [props.floatingUIOptions, show, block, editor, whileElementsMounted],
  );

  const Component = props.sideMenu || SideMenu;

  return (
    <BlockPopover
      blockId={show ? block?.id : undefined}
      portalElement={props.portalElement}
      {...floatingUIOptions}
    >
      {block?.id && <Component />}
    </BlockPopover>
  );
};
