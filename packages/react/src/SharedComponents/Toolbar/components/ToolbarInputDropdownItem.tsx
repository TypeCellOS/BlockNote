import { Container, Group, TextInput, TextInputProps } from "@mantine/core";
import { IconType } from "react-icons";
import { TooltipContent } from "../../Tooltip/components/TooltipContent";
import Tippy from "@tippyjs/react";

export type ToolbarInputDropdownItemProps = {
  icon: IconType;
  mainTooltip: string;
  secondaryTooltip?: string;

  inputProps?: TextInputProps;
};

export const ToolbarInputDropdownItem = (
  props: ToolbarInputDropdownItemProps
) => {
  const Icon = props.icon;

  return (
    <Group>
      <Tippy
        content={
          <TooltipContent
            mainTooltip={props.mainTooltip}
            secondaryTooltip={props.secondaryTooltip}
          />
        }
        placement="left">
        <Container>
          <Icon size={16}></Icon>
        </Container>
      </Tippy>
      <TextInput size={"xs"} {...props.inputProps} />
    </Group>
  );
};
