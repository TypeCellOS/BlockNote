import * as Mantine from "@mantine/core";

import { assertEmpty } from "@blocknote/core";
import { ComponentProps } from "@blocknote/react";
import { forwardRef } from "react";

export const SuggestionMenuItem = forwardRef<
  HTMLDivElement,
  ComponentProps["SuggestionMenu"]["Item"]
>((props, ref) => {
  const { className, isSelected, onClick, item, id, ...rest } = props;

  assertEmpty(rest);

  return (
    <Mantine.Group
      gap={0}
      className={className}
      ref={ref}
      id={id}
      role="option"
      onClick={onClick}
      aria-selected={isSelected || undefined}>
      {item.icon && (
        <Mantine.Group
          className="bn-mt-suggestion-menu-item-section"
          data-position="left">
          {item.icon}
        </Mantine.Group>
      )}
      <Mantine.Stack gap={0} className="bn-mt-suggestion-menu-item-body">
        <Mantine.Text className="bn-mt-suggestion-menu-item-title">
          {item.title}
        </Mantine.Text>
        <Mantine.Text className="bn-mt-suggestion-menu-item-subtitle">
          {item.subtext}
        </Mantine.Text>
      </Mantine.Stack>
      {item.badge && (
        <Mantine.Group
          data-position="right"
          className="bn-mt-suggestion-menu-item-section">
          <Mantine.Badge size={"xs"}>{item.badge}</Mantine.Badge>
        </Mantine.Group>
      )}
    </Mantine.Group>
  );
});
