import * as Mantine from "@mantine/core";

import { ComponentProps } from "@blocknote/react";
import { forwardRef, useCallback } from "react";

export const SuggestionMenuItem = forwardRef<
  HTMLDivElement,
  ComponentProps["SuggestionMenu"]["Item"]
>((props, ref) => {
  const {
    className,
    title,
    subtext,
    // group,
    icon,
    badge,
    // aliases,
    // onItemClick,
    isSelected,
    setSelected,
    onClick,
  } = props;

  const handleMouseLeave = useCallback(() => {
    setSelected?.(false);
  }, [setSelected]);

  const handleMouseEnter = useCallback(() => {
    setSelected?.(true);
  }, [setSelected]);

  return (
    <Mantine.Group
      gap={0}
      className={className}
      ref={ref}
      onClick={onClick}
      // Ensures an item selected with both mouse & keyboard doesn't get deselected on mouse leave.
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      data-hovered={isSelected ? "" : undefined}>
      {icon && (
        <Mantine.Group
          className="bn-mt-suggestion-menu-item-section"
          data-position="left">
          {icon}
        </Mantine.Group>
      )}
      <Mantine.Stack gap={0} className="bn-mt-suggestion-menu-item-body">
        <Mantine.Text className="bn-mt-suggestion-menu-item-title">
          {title}
        </Mantine.Text>
        <Mantine.Text className="bn-mt-suggestion-menu-item-subtitle">
          {subtext}
        </Mantine.Text>
      </Mantine.Stack>
      {badge && (
        <Mantine.Group
          data-position="right"
          className="bn-mt-suggestion-menu-item-section">
          <Mantine.Badge size={"xs"}>{badge}</Mantine.Badge>
        </Mantine.Group>
      )}
    </Mantine.Group>
  );
});
