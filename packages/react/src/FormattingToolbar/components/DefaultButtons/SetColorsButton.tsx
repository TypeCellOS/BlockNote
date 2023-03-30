import { Menu } from "@mantine/core";
import { ToolbarButton } from "../../../SharedComponents/Toolbar/components/ToolbarButton";
import { ColorIcon } from "../../../SharedComponents/ColorPicker/components/ColorIcon";
import { ColorPicker } from "../../../SharedComponents/ColorPicker/components/ColorPicker";

export type ColorsButtonProps = {
  textColor: string;
  setTextColor: (color: string) => void;
  backgroundColor: string;
  setBackgroundColor: (color: string) => void;
};

export const SetColorsButton = (props: ColorsButtonProps) => (
  <Menu>
    <Menu.Target>
      <ToolbarButton
        mainTooltip={"Colors"}
        icon={() => (
          <ColorIcon
            textColor={props.textColor}
            backgroundColor={props.backgroundColor}
            size={20}
          />
        )}
      />
    </Menu.Target>
    <Menu.Dropdown>
      <ColorPicker
        textColor={props.textColor}
        setTextColor={props.setTextColor}
        backgroundColor={props.backgroundColor}
        setBackgroundColor={props.setBackgroundColor}
      />
    </Menu.Dropdown>
  </Menu>
);
