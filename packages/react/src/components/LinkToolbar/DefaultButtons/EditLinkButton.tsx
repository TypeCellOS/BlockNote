import { useComponentsContext } from "../../../editor/ComponentsContext";
import { EditLinkMenuItems } from "../EditLinkMenuItems";
import { LinkToolbarProps } from "../LinkToolbarProps";

export const EditLinkButton = (
  props: Pick<LinkToolbarProps, "url" | "text" | "editLink">
) => {
  const Components = useComponentsContext()!;

  return (
    <Components.Generic.Popover.Root>
      <Components.Generic.Popover.Trigger>
        <Components.LinkToolbar.Button
          className={"bn-button"}
          mainTooltip="Edit"
          isSelected={false}>
          Edit Link
        </Components.LinkToolbar.Button>
      </Components.Generic.Popover.Trigger>
      <Components.Generic.Popover.Content className={"bn-popover-content"}>
        <EditLinkMenuItems {...props} />
      </Components.Generic.Popover.Content>
    </Components.Generic.Popover.Root>
  );
};
