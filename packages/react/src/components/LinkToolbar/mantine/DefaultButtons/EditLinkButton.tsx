import { ToolbarButton } from "../../../mantine-shared/Toolbar/ToolbarButton";
import { ToolbarInputsMenu } from "../../../mantine-shared/Toolbar/ToolbarInputsMenu";
import { LinkToolbarProps } from "../../LinkToolbarProps";
import { EditLinkMenuItems } from "../EditLinkMenuItems";

export const EditLinkButton = (
  props: Pick<LinkToolbarProps, "url" | "text" | "editLink">
) => (
  <ToolbarInputsMenu
    button={
      <ToolbarButton mainTooltip="Edit" isSelected={false}>
        Edit Link
      </ToolbarButton>
    }
    dropdownItems={<EditLinkMenuItems {...props} />}
  />
);
