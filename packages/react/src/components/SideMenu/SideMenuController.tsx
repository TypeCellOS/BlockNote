import { blockHasType } from "@blocknote/core";
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
  const editor = useBlockNoteEditor<any, any, any>();

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

              if (block.type === "heading") {
                if (!block.props.level || block.props.level === 1) {
                  elements.floating.style.setProperty("height", "78px");
                  return;
                }

                if (block.props.level === 2) {
                  elements.floating.style.setProperty("height", "54px");
                  return;
                }

                if (block.props.level === 2) {
                  elements.floating.style.setProperty("height", "37px");
                  return;
                }
              }

              if (
                editor.schema.blockSpecs[block.type].implementation.meta
                  ?.fileBlockAccept
              ) {
                if (
                  blockHasType(block, editor, block.type, {
                    url: "string",
                  }) &&
                  block.props.url === ""
                ) {
                  elements.floating.style.setProperty("height", "54px");
                  return;
                }

                if (
                  block.type === "file" ||
                  (blockHasType(block, editor, block.type, {
                    showPreview: "boolean",
                  }) &&
                    !block.props.showPreview)
                ) {
                  elements.floating.style.setProperty("height", "38px");
                  return;
                }

                if (block.type === "audio") {
                  elements.floating.style.setProperty("height", "60px");
                  return;
                }
              }

              elements.floating.style.setProperty("height", "30px");
              elements.floating.style.height = "30px";
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
      spanEditorWidth={true}
      {...floatingUIOptions}
    >
      {block?.id && <Component />}
    </BlockPopover>
  );
};
