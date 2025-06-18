import { Group as AriakitGroup } from "@ariakit/react";

import { assertEmpty } from "@blocknote/core";
import {
  ComponentProps,
  useDictionary,
  useFocusWithin,
} from "@blocknote/react";
import { forwardRef, useState } from "react";

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

  if (authorInfo === "loading") {
    return (
      <AriakitGroup className={"bn-ak-author-info"}>
        <div className={"bn-ak-avatar bn-ak-skeleton"} />
        <div className={"bn-ak-username bn-ak-skeleton"} />
      </AriakitGroup>
    );
  }

  return (
    <AriakitGroup className={"bn-ak-author-info"}>
      <img
        src={authorInfo.avatarUrl}
        alt={authorInfo.username}
        className={"bn-ak-avatar"}
      />
      <div className={"bn-ak-username"}>
        {authorInfo.username}
        <span>
          {timeString} {edited && `(${dict.comments.edited})`}
        </span>
      </div>
    </AriakitGroup>
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
    edited,
    ...rest
  } = props;

  assertEmpty(rest, false);

  const [hovered, setHovered] = useState(false);
  const { focused, ref: focusRef } = useFocusWithin();

  const doShowActions =
    actions &&
    (showActions === true ||
      showActions === undefined ||
      (showActions === "hover" && hovered) ||
      focused);

  return (
    <AriakitGroup
      ref={ref}
      className={className}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {doShowActions ? (
        <AriakitGroup
          ref={focusRef}
          style={{
            position: "absolute",
            right: 0,
            top: 0,
            zIndex: 10,
          }}
        >
          {actions}
        </AriakitGroup>
      ) : null}
      <AuthorInfo {...props} />
      {children}
    </AriakitGroup>
  );
});
