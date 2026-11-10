import { Flex } from "@mantine/core";

import { assertEmpty } from "@blocknote/core";
import { ComponentProps } from "@blocknote/react";
import { forwardRef } from "react";

type ToolbarProps = ComponentProps["Generic"]["Toolbar"]["Root"];

export const Toolbar = forwardRef<HTMLDivElement, ToolbarProps>(
  (props, ref) => {
    const {
      className,
      "aria-label": ariaLabel,
      children,
      onMouseEnter,
      onMouseLeave,
      variant,
      trapFocus: _trapFocus,
      ...rest
    } = props;

    assertEmpty(rest);

    // No focus trap: the toolbar's menus and popovers portal next to it, so
    // they are not in its subtree, and Mantine's trap would move focus back
    // out of a just-opened form into the toolbar. Tab moves through the
    // buttons and then on, as in the other skins.
    return (
      <Flex
        className={className}
        aria-label={ariaLabel}
        ref={ref}
        role="toolbar"
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        gap={variant === "action-toolbar" ? 2 : undefined}
      >
        {children}
      </Flex>
    );
  },
);
