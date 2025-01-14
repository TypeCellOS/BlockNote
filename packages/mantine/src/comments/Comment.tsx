import { assertEmpty } from "@blocknote/core";
import { ComponentProps } from "@blocknote/react";
import { Avatar, Group, Skeleton, Text } from "@mantine/core";
import { forwardRef } from "react";

const AuthorInfo = forwardRef<
  HTMLDivElement,
  ComponentProps["Comments"]["Comment"]
>((props, ref) => {
  const { className, authorInfo, timeString, actions, children, ...rest } =
    props;

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
  const { className, authorInfo, timeString, actions, children, ...rest } =
    props;

  assertEmpty(rest, false);

  return (
    <>
      <div
        style={{
          position: "absolute",
          right: "var(--mantine-spacing-xs)",
          top: "var(--mantine-spacing-xs)",
          zIndex: 10,
        }}>
        {actions}
      </div>
      <AuthorInfo {...props} />
      {children}
    </>
  );
});
