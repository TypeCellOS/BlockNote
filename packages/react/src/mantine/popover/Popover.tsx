import * as mantine from "@mantine/core";

export const Popover = (props: mantine.PopoverProps) => {
  const { children, ...rest } = props;
  console.log("whuut");
  return (
    <mantine.Popover {...rest} withinPortal={false} zIndex={10000}>
      {children}
    </mantine.Popover>
  );
};
