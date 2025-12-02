import { SideMenuExtension } from "@blocknote/core/extensions";
import { MdDragIndicator } from "react-icons/md";

import { useComponentsContext } from "../../../editor/ComponentsContext.js";
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
  const dict = useDictionary();

  const sideMenu = useExtension(SideMenuExtension);
  const block = useExtensionState(SideMenuExtension, {
    selector: (state) => state?.block,
  });

  if (block === undefined) {
    return null;
  }

  const Component = props.dragHandleMenu || DragHandleMenu;

  return (
    <Components.Generic.Menu.Root
      onOpenChange={(open: boolean) => {
        if (open) {
          sideMenu.freezeMenu();
        } else {
          sideMenu.unfreezeMenu();
        }
      }}
      position={"left"}
    >
      <Components.Generic.Menu.Trigger>
        <Components.SideMenu.Button
          label={dict.side_menu.drag_handle_label}
          draggable={true}
          onDragStart={(e) => sideMenu.blockDragStart(e, block)}
          onDragEnd={sideMenu.blockDragEnd}
          className={"bn-button"}
          icon={<MdDragIndicator size={24} data-test="dragHandle" />}
        />
      </Components.Generic.Menu.Trigger>
      <Component>{props.children}</Component>
    </Components.Generic.Menu.Root>
  );
};
