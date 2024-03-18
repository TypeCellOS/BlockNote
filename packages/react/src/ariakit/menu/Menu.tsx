export {
  MenuProvider as Menu,
  MenuSeparator as MenuDivider,
  MenuItem as MenuLabel,
  MenuButton as MenuTarget,
} from "@ariakit/react";

import * as Ariakit from "@ariakit/react";
import { mergeCSSClasses } from "@blocknote/core";
import { HTMLAttributes, forwardRef } from "react";

export const MenuDropdown = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>((props, ref) => {
  const { className, children, ...rest } = props;

  return (
    <Ariakit.Menu
      {...rest}
      className={mergeCSSClasses("bn-menu", className || "")}
      ref={ref}>
      {children}
    </Ariakit.Menu>
  );
});

export const MenuItem = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>((props, ref) => {
  const { className, children, ...rest } = props;

  return (
    <Ariakit.MenuItem
      {...rest}
      className={mergeCSSClasses("bn-menu-item", className || "")}
      ref={ref}>
      {children}
    </Ariakit.MenuItem>
  );
});

// export {}
// Menu,
// MenuTarget,
// MenuDropdown,
// MenuDivider,
// MenuLabel,
// MenuItem,
