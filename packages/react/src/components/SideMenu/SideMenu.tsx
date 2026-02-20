import { SideMenuExtension } from "@blocknote/core/extensions";
import { ReactNode, useMemo } from "react";

import { useComponentsContext } from "../../editor/ComponentsContext.js";
import { useBlockNoteEditor } from "../../hooks/useBlockNoteEditor.js";
import { useExtensionState } from "../../hooks/useExtension.js";
import { AddBlockButton } from "./DefaultButtons/AddBlockButton.js";
import { DragHandleButton } from "./DefaultButtons/DragHandleButton.js";
import { SideMenuProps } from "./SideMenuProps.js";

// TODO: props.dragHandleMenu should only be available if no children are passed
/**
 * By default, the SideMenu component will render with default buttons. However,
 * you can override the buttons to render by passing children. The children you
 * pass should be:
 *
 * - Default buttons: Components found within the `/DefaultButtons` directory.
 * - Custom buttons: The `SideMenuButton` component.
 */
export const SideMenu = (props: SideMenuProps & { children?: ReactNode }) => {
  const Components = useComponentsContext()!;

  const editor = useBlockNoteEditor<any, any, any>();

  const block = useExtensionState(SideMenuExtension, {
    editor,
    selector: (state) => state?.block,
  });

  const dataAttributes = useMemo(() => {
    if (block === undefined) {
      return {};
    }

    const attrs: Record<string, string> = {
      "data-block-type": block.type,
    };

    if (block.type === "heading") {
      attrs["data-level"] = (block.props as any).level.toString();
    }

    if (
      editor.schema.blockSpecs[block.type].implementation.meta?.fileBlockAccept
    ) {
      if (block.props.url) {
        attrs["data-url"] = "true";
      } else {
        attrs["data-url"] = "false";
      }
    }

    return attrs;
  }, [block, editor.schema.blockSpecs]);

  return (
    <Components.SideMenu.Root className={"bn-side-menu"} {...dataAttributes}>
      {props.children || (
        <>
          <AddBlockButton />
          <DragHandleButton dragHandleMenu={props.dragHandleMenu} />
        </>
      )}
    </Components.SideMenu.Root>
  );
};
