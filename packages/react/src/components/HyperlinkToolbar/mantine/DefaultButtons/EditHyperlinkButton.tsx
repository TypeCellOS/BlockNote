import { ToolbarButton } from "../../../mantine-shared/Toolbar/ToolbarButton";
import { ToolbarInputsMenu } from "../../../mantine-shared/Toolbar/ToolbarInputsMenu";
import { HyperlinkToolbarProps } from "../../HyperlinkToolbarProps";
import { EditHyperlinkMenuItems } from "../EditHyperlinkMenuItems";

export const EditHyperlinkButton = (
  props: Pick<HyperlinkToolbarProps, "url" | "text" | "editHyperlink">
) => (
  <ToolbarInputsMenu
    button={
      <ToolbarButton mainTooltip="Edit" isSelected={false}>
        Edit Link
      </ToolbarButton>
    }
    dropdownItems={<EditHyperlinkMenuItems {...props} />}
  />
);
