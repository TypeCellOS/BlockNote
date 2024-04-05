import * as Mantine from "@mantine/core";

export const Popover = (props: Mantine.PopoverProps) => {
  const { children, ...rest } = props;

  return (
    <Mantine.Popover {...rest} withinPortal={false} zIndex={10000}>
      {children}
    </Mantine.Popover>
  );
};
