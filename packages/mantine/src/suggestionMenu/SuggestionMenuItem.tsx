import {
  Badge as MantineBadge,
  Group as MantineGroup,
  Stack as MantineStack,
  Text as MantineText,
} from "@mantine/core";

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
    <MantineGroup
      gap={0}
      className={className}
      ref={ref}
      id={id}
      role="option"
      onClick={onClick}
      aria-selected={isSelected || undefined}>
      {item.icon && (
        <MantineGroup
          className="bn-mt-suggestion-menu-item-section"
          data-position="left">
          {item.icon}
        </MantineGroup>
      )}
      <MantineStack gap={0} className="bn-mt-suggestion-menu-item-body">
        <MantineText className="bn-mt-suggestion-menu-item-title">
          {item.title}
        </MantineText>
        <MantineText className="bn-mt-suggestion-menu-item-subtitle">
          {item.subtext}
        </MantineText>
      </MantineStack>
      {item.badge && (
        <MantineGroup
          data-position="right"
          className="bn-mt-suggestion-menu-item-section">
          <MantineBadge size={"xs"}>{item.badge}</MantineBadge>
        </MantineGroup>
      )}
    </MantineGroup>
  );
});
