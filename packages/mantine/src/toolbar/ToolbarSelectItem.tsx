import * as Mantine from "@mantine/core";

import { ToolbarSelectItemProps } from "@blocknote/react";
import { TiTick } from "react-icons/ti";

export function ToolbarSelectItem(props: ToolbarSelectItemProps) {
  return (
    <Mantine.Menu.Item
      key={props.text}
      onClick={props.onClick}
      leftSection={props.icon}
      rightSection={
        props.isSelected ? (
          <TiTick size={20} className={"bn-tick-icon"} />
        ) : (
          // Ensures space for tick even if item isn't currently selected.
          <div className={"bn-tick-space"} />
        )
      }
      disabled={props.isDisabled}>
      {props.text}
    </Mantine.Menu.Item>
  );
}
