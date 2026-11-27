import { SideMenuExtension } from "@blocknote/core/extensions";
import { useEffect, useRef } from "react";
import { MdDragIndicator } from "react-icons/md";

import { useComponentsContext } from "../../../editor/ComponentsContext.js";
import { useBlockNoteEditor } from "../../../hooks/useBlockNoteEditor.js";
import { useEditorState } from "../../../hooks/useEditorState.js";
import { usePortalElement } from "../../../editor/PortalElementOverride.js";
import { useDictionary } from "../../../i18n/dictionary.js";
import { DragHandleMenu } from "../DragHandleMenu/DragHandleMenu.js";
import { SideMenuProps } from "../SideMenuProps.js";
import {
  useExtension,
  useExtensionState,
} from "../../../hooks/useExtension.js";

export const DragHandleButton = (
  props: SideMenuProps & {
    children?: React.ReactNode;
  },
) => {
  const Components = useComponentsContext()!;
  const portalElement = usePortalElement();
  const dict = useDictionary();

  const editor = useBlockNoteEditor();
  const sideMenu = useExtension(SideMenuExtension);
  const isEditable = useEditorState({
    editor,
    selector: ({ editor }) => editor.isEditable,
  });
  const block = useExtensionState(SideMenuExtension, {
    selector: (state) => state?.block,
  });

  // Release the freeze when the open menu can no longer be shown.
  const menuOpen = useRef(false);
  useEffect(() => {
    if ((!isEditable || block === undefined) && menuOpen.current) {
      menuOpen.current = false;
      sideMenu.unfreezeMenu();
    }
  }, [isEditable, block, sideMenu]);

  useEffect(() => {
    return () => {
      if (menuOpen.current) {
        menuOpen.current = false;
        sideMenu.unfreezeMenu({ restoreFocus: false });
      }
    };
  }, [sideMenu]);

  if (!isEditable || block === undefined) {
    return null;
  }

  const Component = props.dragHandleMenu || DragHandleMenu;

  return (
    <Components.Generic.Menu.Root
      onOpenChange={(open: boolean) => {
        menuOpen.current = open;
        if (open) {
          sideMenu.freezeMenu();
        } else {
          sideMenu.unfreezeMenu();
        }
      }}
      position={"left"}
      portalElement={portalElement}
    >
      <Components.Generic.Menu.Trigger>
        <Components.SideMenu.Button
          label={dict.side_menu.drag_handle_label}
          draggable={true}
          onDragStart={(e) => sideMenu.blockDragStart(e, block)}
          // eslint-disable-next-line @typescript-eslint/unbound-method -- blockDragEnd is a plain object method, not a class method
          onDragEnd={sideMenu.blockDragEnd}
          className={"bn-side-menu-button"}
          icon={
            <MdDragIndicator
              size={24}
              data-test="dragHandle"
              data-side-menu-block-id={block.id}
            />
          }
        />
      </Components.Generic.Menu.Trigger>
      <Component>{props.children}</Component>
    </Components.Generic.Menu.Root>
  );
};
