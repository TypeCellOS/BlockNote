import * as Ariakit from "@ariakit/react";

import { ComponentProps } from "@blocknote/react";

export const Menu = (props: ComponentProps["Generic"]["Menu"]["Root"]) => {
  const { onOpenChange, position, ...rest } = props;

  return (
    <Ariakit.MenuProvider
      placement={position}
      setOpen={onOpenChange}
      virtualFocus={true}
      {...rest}
    />
  );
};

export const MenuDropdown = (
  props: ComponentProps["Generic"]["Menu"]["Dropdown"]
) => {
  const { className, children, ...rest } = props;

  return (
    <Ariakit.Menu {...rest} className={className}>
      {children}
    </Ariakit.Menu>
  );
};

export const MenuItem = (props: ComponentProps["Generic"]["Menu"]["Item"]) => {
  const { className, children, icon, checked, subTrigger, onClick } = props;

  if (subTrigger) {
    return (
      <Ariakit.MenuButton className={className} onClick={onClick}>
        {icon}
        {children}
        <Ariakit.MenuButtonArrow />
        {checked !== undefined && <Ariakit.CheckboxCheck checked={checked} />}
      </Ariakit.MenuButton>
    );
  }
  return (
    <Ariakit.MenuItem className={className} onClick={onClick}>
      {icon}
      {children}
      {checked !== undefined && <Ariakit.CheckboxCheck checked={checked} />}
    </Ariakit.MenuItem>
  );
};

export const MenuLabel = (
  props: ComponentProps["Generic"]["Menu"]["Label"]
) => {
  const { children, ...rest } = props;

  return <Ariakit.MenuGroupLabel {...rest}>{children}</Ariakit.MenuGroupLabel>;
};

export const MenuTrigger = (
  props: ComponentProps["Generic"]["Menu"]["Trigger"]
) => {
  const { children, ...rest } = props;

  return (
    <Ariakit.MenuButton {...rest} render={children as any}></Ariakit.MenuButton>
  );
};

export const MenuDivider = (
  props: ComponentProps["Generic"]["Menu"]["Divider"]
) => {
  return <Ariakit.MenuSeparator {...props} />;
};
