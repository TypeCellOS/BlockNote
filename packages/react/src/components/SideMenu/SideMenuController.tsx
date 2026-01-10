import { BlockSchema, InlineContentSchema, StyleSchema } from "@blocknote/core";
import { SideMenuExtension } from "@blocknote/core/extensions";
import { size } from "@floating-ui/react";
import { FC, useMemo } from "react";

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
  const editor = useBlockNoteEditor<
    BlockSchema,
    InlineContentSchema,
    StyleSchema
  >();

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
        middleware: [
          // Adjusts the side menu height to align it vertically with the
          // block's content. In some cases, like file blocks with captions,
          // the height and top offset is adjusted to align it with a specific
          // element within the block's content instead.
          size({
            apply({ elements }) {
              // TODO: Need to fetch the block from extension, else it's
              // always `undefined` for some reason? Shouldn't the `apply`
              // function get recreated with the updated `block` object each
              // time it changes?
              const block =
                editor.getExtension(SideMenuExtension)?.store.state?.block;
              if (block === undefined) {
                return;
              }

              const blockElement =
                elements.reference instanceof Element
                  ? elements.reference
                  : elements.reference.contextElement;
              if (blockElement === undefined) {
                return;
              }

              const blockContentElement =
                blockElement.querySelector(".bn-block-content");
              if (blockContentElement === null) {
                return;
              }

              const blockContentBoundingClientRect =
                blockContentElement.getBoundingClientRect();

              // Special case for file blocks with captions. In this case, we
              // align the side menu with the first sibling of the file caption
              // element.
              const fileCaptionParentElement =
                blockContentElement.querySelector(".bn-file-caption")
                  ?.parentElement || null;
              if (fileCaptionParentElement !== null) {
                const fileElement = fileCaptionParentElement.firstElementChild;
                if (fileElement) {
                  const fileBoundingClientRect =
                    fileElement.getBoundingClientRect();

                  elements.floating.style.setProperty(
                    "height",
                    `${fileBoundingClientRect.height}px`,
                  );
                  elements.floating.style.setProperty(
                    "top",
                    `${fileBoundingClientRect.y - blockContentBoundingClientRect.y}px`,
                  );

                  return;
                }
              }

              // Special case for toggleable blocks. In this case, we align the
              // side menu with the element containing the toggle button and
              // rich text.
              const toggleWrapperElement =
                blockContentElement.querySelector(".bn-toggle-wrapper");
              if (toggleWrapperElement !== null) {
                const toggleWrapperBoundingClientRect =
                  toggleWrapperElement.getBoundingClientRect();

                elements.floating.style.setProperty(
                  "height",
                  `${toggleWrapperBoundingClientRect.height}px`,
                );
                elements.floating.style.setProperty(
                  "top",
                  `${toggleWrapperBoundingClientRect.y - blockContentBoundingClientRect.y}px`,
                );

                return;
              }

              // Special case for table blocks. In this case, we align the side
              // menu with the table element inside the block.
              const tableElement = blockContentElement.querySelector(
                ".tableWrapper table",
              );
              if (tableElement !== null) {
                const tableBoundingClientRect =
                  tableElement.getBoundingClientRect();

                elements.floating.style.setProperty(
                  "height",
                  `${tableBoundingClientRect.height}px`,
                );
                elements.floating.style.setProperty(
                  "top",
                  `${tableBoundingClientRect.y - blockContentBoundingClientRect.y}px`,
                );

                return;
              }

              // Regular case, in which the side menu is aligned with the block
              // content element.
              elements.floating.style.setProperty(
                "height",
                `${blockContentBoundingClientRect.height}px`,
              );
              elements.floating.style.setProperty("top", "0");
            },
          }),
        ],
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
    [editor, props.floatingUIOptions, show],
  );

  const Component = props.sideMenu || SideMenu;

  return (
    <BlockPopover
      blockId={show ? block?.id : undefined}
      ignoreNestingOffset={true}
      {...floatingUIOptions}
    >
      {block?.id && <Component />}
    </BlockPopover>
  );
};
