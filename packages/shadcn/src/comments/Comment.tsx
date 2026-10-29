import { assertEmpty } from "@blocknote/core";
import { ComponentProps, useDictionary } from "@blocknote/react";
import { forwardRef } from "react";

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
      <div className={"flex flex-row flex-nowrap items-center gap-4"}>
        <ShadCNComponents.Skeleton.Skeleton
          className={"size-7 animate-pulse rounded-full bg-neutral-400"}
        />
        <ShadCNComponents.Skeleton.Skeleton
          className={"h-3 w-32 animate-pulse rounded-full bg-neutral-400"}
        />
      </div>
    );
  }

  return (
    <div className={"flex flex-row flex-nowrap items-center gap-4"}>
      <ShadCNComponents.Avatar.Avatar>
        <ShadCNComponents.Avatar.AvatarImage
          src={authorInfo.avatarUrl}
          alt={authorInfo.username}
          className={"h-7 rounded-full"}
        />
        <ShadCNComponents.Avatar.AvatarFallback>
          {authorInfo.username[0]}
        </ShadCNComponents.Avatar.AvatarFallback>
      </ShadCNComponents.Avatar.Avatar>

      <div className={"flex flex-row flex-nowrap items-center gap-2"}>
        <span className={"text-sm font-bold"}>{authorInfo.username}</span>
        <span className={"text-xs"}>
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
    authorInfo: _authorInfo,
    timeString: _timeString,
    actions,
    edited: _edited,
    emojiPickerOpen,
    children,
    ...rest
  } = props;

  assertEmpty(rest);

  return (
    <div ref={ref} className={cn(className, "relative flex flex-col gap-2")}>
      {actions && (showActions !== false || emojiPickerOpen) ? (
        <div
          className={"bn-comment-toolbar absolute top-0 right-0 z-10"}
          data-show={emojiPickerOpen ? true : (showActions ?? true)}
        >
          {actions}
        </div>
      ) : null}
      <AuthorInfo {...props} />
      {children}
    </div>
  );
});
