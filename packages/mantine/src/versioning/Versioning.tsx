import { assertEmpty, mergeCSSClasses } from "@blocknote/core";
import { type ComponentProps } from "@blocknote/react";
import { Box, Card, Group, Input, Stack, Text, Title } from "@mantine/core";
import { forwardRef } from "react";

export const Sidebar = forwardRef<
  HTMLDivElement,
  ComponentProps["Versioning"]["Sidebar"]
>((props, ref) => {
  const { className, children, "aria-label": ariaLabel, ...rest } = props;
  assertEmpty(rest, false);

  return (
    <Box className={className} ref={ref} role="region" aria-label={ariaLabel}>
      {children}
    </Box>
  );
});

export function Header(props: ComponentProps["Versioning"]["Header"]) {
  const { className, title, actions, closeAction, ...rest } = props;
  assertEmpty(rest, false);

  return (
    <Group className={className} justify="space-between" wrap="nowrap">
      <Group
        className="bn-versioning-sidebar-header-title"
        gap={6}
        wrap="nowrap"
      >
        <Title className="bn-versioning-sidebar-title" order={2}>
          {title}
        </Title>
        {actions}
      </Group>
      {closeAction}
    </Group>
  );
}

export function Name(props: ComponentProps["Versioning"]["Name"]) {
  if (props.mode === "display") {
    return (
      <Text component="span" className="bn-snapshot-name">
        {props.value}
      </Text>
    );
  }

  return (
    <Box
      component="span"
      className="bn-snapshot-name-sizer"
      data-value={props.value === "" ? props.placeholder : props.value}
    >
      <Input
        ref={props.inputRef}
        className="bn-snapshot-name"
        classNames={{ input: "bn-snapshot-name" }}
        unstyled
        type="text"
        value={props.value}
        placeholder={props.placeholder}
        aria-label={props["aria-label"]}
        onChange={props.onChange}
        onClick={props.onClick}
        onKeyDown={props.onKeyDown}
        onBlur={props.onBlur}
      />
    </Box>
  );
}

export const Snapshot = forwardRef<
  HTMLDivElement,
  ComponentProps["Versioning"]["Snapshot"]
>((props, ref) => {
  const {
    className,
    id,
    "aria-label": ariaLabel,
    state,
    tabIndex,
    "aria-busy": ariaBusy,
    onClick,
    onKeyDown,
    onFocus,
    actions,
    name,
    date,
    restoredFrom,
    secondaryLabel,
    comparingLabel,
    comparingIcon,
    ...rest
  } = props;
  assertEmpty(rest, false);
  const snapshotStateClass = (
    {
      default: "",
      selected: "selected",
      "comparison-source": "selected bn-snapshot-comparison-source",
      "comparison-baseline": "comparing",
    } satisfies Record<typeof state, string>
  )[state];

  return (
    <Card
      className={mergeCSSClasses(className, snapshotStateClass)}
      id={id}
      role="listitem"
      aria-label={ariaLabel}
      aria-current={
        state === "selected" || state === "comparison-source"
          ? "true"
          : undefined
      }
      aria-busy={ariaBusy}
      tabIndex={tabIndex}
      onClick={onClick}
      onKeyDown={onKeyDown}
      onFocus={onFocus}
      ref={ref}
    >
      {comparingLabel && (
        <Group className="bn-snapshot-comparing-to" gap={4} wrap="nowrap">
          {comparingIcon}
          <Text component="span">{comparingLabel}</Text>
        </Group>
      )}
      <Stack className="bn-snapshot-body" gap={2}>
        <Group className="bn-snapshot-title-row" gap={6} wrap="nowrap">
          {name}
        </Group>
        {date && <Text className="bn-snapshot-date">{date}</Text>}
        {restoredFrom && (
          <Text className="bn-snapshot-original-date">{restoredFrom}</Text>
        )}
        {secondaryLabel && (
          <Text className="bn-snapshot-secondary-label">{secondaryLabel}</Text>
        )}
      </Stack>
      {actions && (
        <Box
          className="bn-snapshot-menu"
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        >
          {actions}
        </Box>
      )}
    </Card>
  );
});
