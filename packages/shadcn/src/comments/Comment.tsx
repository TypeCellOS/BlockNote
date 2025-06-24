import { assertEmpty } from "@blocknote/core";
import {
  ComponentProps,
  useDictionary,
  useFocusWithin,
} from "@blocknote/react";
import { forwardRef, useState } from "react";

import { cn } from "../lib/utils.js";
import { useShadCNComponentsContext } from "../ShadCNComponentsContext.js";

const AuthorInfo = forwardRef<
  HTMLDivElement,
  Pick<
    ComponentProps["Comments"]["Comment"],
    "authorInfo" | "timeString" | "edited"
  >
>((props, _ref) => {
  const { authorInfo, timeString, edited, ...rest } = props;
  const dict = useDictionary();

  assertEmpty(rest, false);

  const ShadCNComponents = useShadCNComponentsContext()!;

  if (authorInfo === "loading") {
    return (
      <div
        className={
          "bn-flex bn-flex-row bn-flex-nowrap bn-items-center bn-gap-4"
        }
      >
        <ShadCNComponents.Skeleton.Skeleton
          className={
            "bn-size-7 bn-rounded-full bn-bg-neutral-400 bn-animate-pulse"
          }
        />
        <ShadCNComponents.Skeleton.Skeleton
          className={
            "bn-h-3 bn-w-32 bn-rounded-full bn-bg-neutral-400 bn-animate-pulse"
          }
        />
      </div>
    );
  }

  return (
    <div
      className={"bn-flex bn-flex-row bn-flex-nowrap bn-items-center bn-gap-4"}
    >
      <ShadCNComponents.Avatar.Avatar>
        <ShadCNComponents.Avatar.AvatarImage
          src={authorInfo.avatarUrl}
          alt={authorInfo.username}
          className={"bn-h-7 bn-rounded-full"}
        />
        <ShadCNComponents.Avatar.AvatarFallback>
          {authorInfo.username[0]}
        </ShadCNComponents.Avatar.AvatarFallback>
      </ShadCNComponents.Avatar.Avatar>

      <div
        className={
          "bn-flex bn-flex-row bn-flex-nowrap bn-items-center bn-gap-2"
        }
      >
        <span className={"bn-text-sm bn-font-bold"}>{authorInfo.username}</span>
        <span className={"bn-text-xs"}>
          {timeString} {edited && `(${dict.comments.edited})`}
        </span>
      </div>
    </div>
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
    edited,
    children,
    ...rest
  } = props;

  assertEmpty(rest);

  const [hovered, setHovered] = useState(false);
  const { focused, ref: focusRef } = useFocusWithin();

  const doShowActions =
    actions &&
    (showActions === true ||
      showActions === undefined ||
      (showActions === "hover" && hovered) ||
      focused);

  return (
    <div
      ref={ref}
      className={cn(className, "bn-relative bn-flex bn-flex-col bn-gap-2")}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {doShowActions ? (
        <div
          className={"bn-absolute bn-right-0 bn-top-0 bn-z-10"}
          ref={focusRef}
        >
          {actions}
        </div>
      ) : null}
      <AuthorInfo {...props} />
      {children}
    </div>
  );
});
