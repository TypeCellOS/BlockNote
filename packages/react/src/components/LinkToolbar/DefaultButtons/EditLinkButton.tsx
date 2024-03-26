import { useComponentsContext } from "../../../editor/ComponentsContext";
import { ToolbarButton } from "../../../mantine/toolbar/ToolbarButton";
import { EditLinkMenuItems } from "../EditLinkMenuItems";
import { LinkToolbarProps } from "../LinkToolbarProps";

export const EditLinkButton = (
  props: Pick<LinkToolbarProps, "url" | "text" | "editLink">
) => {
  const components = useComponentsContext()!;
  return (
    <components.Popover>
      <components.PopoverTrigger>
        <ToolbarButton mainTooltip="Edit" isSelected={false}>
          Edit Link
        </ToolbarButton>
      </components.PopoverTrigger>
      <components.PopoverContent>
        <EditLinkMenuItems {...props} />
      </components.PopoverContent>
    </components.Popover>
  );
};
