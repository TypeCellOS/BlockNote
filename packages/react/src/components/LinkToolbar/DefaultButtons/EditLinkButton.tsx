import { useComponentsContext } from "../../../editor/ComponentsContext";
import { EditLinkMenuItems } from "../EditLinkMenuItems";
import { LinkToolbarProps } from "../LinkToolbarProps";

export const EditLinkButton = (
  props: Pick<LinkToolbarProps, "url" | "text" | "editLink">
) => {
  const components = useComponentsContext()!;

  return (
    <components.Popover>
      <components.PopoverTrigger>
        <components.ToolbarButton mainTooltip="Edit" isSelected={false}>
          Edit Link
        </components.ToolbarButton>
      </components.PopoverTrigger>
      <components.PopoverContent>
        <EditLinkMenuItems {...props} />
      </components.PopoverContent>
    </components.Popover>
  );
};
