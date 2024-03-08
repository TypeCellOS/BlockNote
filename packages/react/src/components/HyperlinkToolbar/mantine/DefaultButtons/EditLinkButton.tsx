import { ToolbarButton } from "../../../mantine-shared/Toolbar/ToolbarButton";
import { ToolbarInputDropdownButton } from "../../../mantine-shared/Toolbar/ToolbarInputDropdownButton";
import { HyperlinkToolbarProps } from "../../HyperlinkToolbarProps";
import { EditLinkMenu } from "../EditLinkMenu";

export const EditLinkButton = (
  props: Pick<HyperlinkToolbarProps, "url" | "text" | "editHyperlink">
) => (
  <ToolbarInputDropdownButton
    target={
      <ToolbarButton mainTooltip="Edit" isSelected={false}>
        Edit Link
      </ToolbarButton>
    }
    dropdown={<EditLinkMenu {...props} />}
  />
);
