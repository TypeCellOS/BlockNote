import { assertEmpty } from "@blocknote/core";
import { ComponentProps, mergeRefs } from "@blocknote/react";
import { Avatar, Group, Skeleton, Text } from "@mantine/core";
import { useHover } from "@mantine/hooks";
import { forwardRef } from "react";

const AuthorInfo = forwardRef<
  HTMLDivElement,
  Pick<ComponentProps["Comments"]["Comment"], "authorInfo" | "timeString">
>((props, ref) => {
  const { authorInfo, timeString, ...rest } = props;

  assertEmpty(rest, false);

  if (authorInfo === "loading") {
    return (
      <Group>
        <Skeleton height={24} width={24} />
        <div>
          <Skeleton height={12} width={100} />
        </div>
      </Group>
    );
  }

  return (
    <Group>
      <Avatar
        src={authorInfo.avatarUrl}
        alt={authorInfo.username}
        radius="xl"
        size="sm"
        // name={authorInfo.username} TODO: upgrade mantine?
        color="initials"
      />

      <Text fz="sm" fw={"bold"}>
        {authorInfo.username}
        <Text fz="xs" c="dimmed" span ml={"xs"}>
          {timeString}
        </Text>
      </Text>
    </Group>
  );
});

export const Comment = forwardRef<
  HTMLDivElement,
  ComponentProps["Comments"]["Comment"]
>((props, ref) => {
  const {
    className,
    showActions,
    authorInfo,
    timeString,
    actions,
    children,
    ...rest
  } = props;

  const { hovered, ref: hoverRef } = useHover();
  const mergedRef = mergeRefs([ref, hoverRef]);
  assertEmpty(rest, false);

  const doShowActions =
    actions &&
    (showActions === true ||
      showActions === undefined ||
      (showActions === "hover" && hovered));

  return (
    <Group pos="relative" ref={mergedRef} className={className}>
      {doShowActions ? (
        <Group
          style={{
            position: "absolute",
            right: 0,
            top: 0,
            zIndex: 10,
          }}>
          {actions}
        </Group>
      ) : null}
      <AuthorInfo {...props} />
      {children}
    </Group>
  );
});
