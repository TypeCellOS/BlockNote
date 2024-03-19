import * as mantine from "@mantine/core";
import { MenuProps } from "../../../editor/ComponentsContext";
export {
  MenuDivider,
  MenuDropdown,
  MenuItem,
  MenuLabel,
  MenuTarget,
} from "@mantine/core";

export const Menu = (props: MenuProps) => {
  const { onOpenChange, open, defaultOpen, ...rest } = props;

  return (
    <mantine.Menu
      withinPortal={false}
      middlewares={{ flip: true, shift: true, inline: false, size: true }}
      onClose={() => onOpenChange?.(false)}
      onOpen={() => onOpenChange?.(true)}
      opened={open}
      defaultOpened={defaultOpen}
      {...rest}
    />
  );
};
