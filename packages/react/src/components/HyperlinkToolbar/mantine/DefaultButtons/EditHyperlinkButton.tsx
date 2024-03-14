import { ToolbarButton } from "../../../mantine-shared/Toolbar/ToolbarButton";
import { ToolbarInputDropdownButton } from "../../../mantine-shared/Toolbar/ToolbarInputDropdownButton";
import { HyperlinkToolbarProps } from "../../HyperlinkToolbarProps";
import { EditHyperlinkMenu } from "../EditHyperlinkMenu";

export const EditHyperlinkButton = (
  props: Pick<HyperlinkToolbarProps, "url" | "text" | "editHyperlink">
) => (
  <ToolbarInputDropdownButton
    target={
      <ToolbarButton mainTooltip="Edit" isSelected={false}>
        Edit Link
      </ToolbarButton>
    }
    dropdown={<EditHyperlinkMenu {...props} />}
  />
);
