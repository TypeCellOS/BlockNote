import { Group, Stack, Text, Badge } from "@mantine/core";

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
    <Group
      gap={0}
      className={className}
      ref={ref}
      id={id}
      role="option"
      onClick={onClick}
      aria-selected={isSelected || undefined}>
      {item.icon && (
        <Group
          className="bn-mt-suggestion-menu-item-section"
          data-position="left">
          {item.icon}
        </Group>
      )}
      <Stack gap={0} className="bn-mt-suggestion-menu-item-body">
        <Text className="bn-mt-suggestion-menu-item-title">{item.title}</Text>
        <Text className="bn-mt-suggestion-menu-item-subtitle">
          {item.subtext}
        </Text>
      </Stack>
      {item.badge && (
        <Group
          data-position="right"
          className="bn-mt-suggestion-menu-item-section">
          <Badge size={"xs"}>{item.badge}</Badge>
        </Group>
      )}
    </Group>
  );
});
