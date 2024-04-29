import { useComponentsContext } from "../../../editor/ComponentsContext";
import { useDictionaryContext } from "../../../editor/Dictionary";
import { EditLinkMenuItems } from "../EditLinkMenuItems";
import { LinkToolbarProps } from "../LinkToolbarProps";

export const EditLinkButton = (
  props: Pick<LinkToolbarProps, "url" | "text" | "editLink">
) => {
  const Components = useComponentsContext()!;
  const dict = useDictionaryContext();

  return (
    <Components.Generic.Popover.Root>
      <Components.Generic.Popover.Trigger>
        <Components.LinkToolbar.Button
          className={"bn-button"}
          mainTooltip={dict.link_toolbar.edit.tooltip}
          isSelected={false}>
          {dict.link_toolbar.edit.text}
        </Components.LinkToolbar.Button>
      </Components.Generic.Popover.Trigger>
      <Components.Generic.Popover.Content
        className={"bn-popover-content bn-input-popover"}>
        <EditLinkMenuItems {...props} />
      </Components.Generic.Popover.Content>
    </Components.Generic.Popover.Root>
  );
};
