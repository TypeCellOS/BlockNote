import { MenuItemProps } from "@mantine/core";
import { PolymorphicComponentProps } from "@mantine/utils";
import { useComponentsContext } from "../../../../editor/ComponentsContext";

export const TableHandleMenuItem = (
  props: PolymorphicComponentProps<"button"> & MenuItemProps
) => {
  const components = useComponentsContext()!;
  const { children, ...remainingProps } = props;
  return (
    <components.MenuItem {...remainingProps}>{children}</components.MenuItem>
  );
};
