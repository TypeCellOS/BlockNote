import { assertEmpty } from "@blocknote/core";
import { type ComponentProps } from "@blocknote/react";
import { Box, Text, UnstyledButton } from "@mantine/core";

export function Root(props: ComponentProps["TableOfContents"]["Root"]) {
  const { className, title, children, ...rest } = props;
  assertEmpty(rest, false);

  return (
    <Box component="nav" className={className} aria-label={title}>
      <Text className="bn-table-of-contents-title">{title}</Text>
      {children}
    </Box>
  );
}

export function Item(props: ComponentProps["TableOfContents"]["Item"]) {
  const { className, depth, isActive, onClick, children, ...rest } = props;
  assertEmpty(rest, false);

  return (
    <UnstyledButton
      className={className}
      style={{ paddingInlineStart: 12 + depth * 12 }}
      aria-current={isActive ? "location" : undefined}
      onClick={onClick}
    >
      {children}
    </UnstyledButton>
  );
}
