import * as mantine from "@mantine/core";
export {
  MenuDivider,
  MenuDropdown,
  MenuItem,
  MenuLabel,
  MenuTarget,
} from "@mantine/core";

export const Menu = (props: mantine.MenuProps) => {
  return <mantine.Menu withinPortal={false} {...props} />;
};
