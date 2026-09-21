import { assertEmpty } from "@blocknote/core";
import { type ComponentProps } from "@blocknote/react";
import { forwardRef } from "react";

import { cn } from "../lib/utils.js";
import { useShadCNComponentsContext } from "../ShadCNComponentsContext.js";

export const Sidebar = forwardRef<
  HTMLDivElement,
  ComponentProps["Versioning"]["Sidebar"]
>((props, ref) => {
  const { className, children, "aria-label": ariaLabel, ...rest } = props;
  assertEmpty(rest, false);

  return (
    <div
      className={cn(
        className,
        "flex min-h-0 flex-1 flex-col overflow-hidden px-4",
      )}
      ref={ref}
      role="region"
      aria-label={ariaLabel}
    >
      {children}
    </div>
  );
});

export function Header(props: ComponentProps["Versioning"]["Header"]) {
  const { className, title, actions, closeAction, ...rest } = props;
  assertEmpty(rest, false);

  return (
    <div
      className={cn(
        className,
        "flex shrink-0 items-center justify-between pt-4 pb-2",
      )}
    >
      <div className="flex items-center gap-1.5">
        <h2 className="text-card-foreground m-0 text-lg font-bold">{title}</h2>
        {actions}
      </div>
      {closeAction}
    </div>
  );
}

export function Name(props: ComponentProps["Versioning"]["Name"]) {
  const ShadCNComponents = useShadCNComponentsContext()!;

  if (props.mode === "display") {
    return <span className="bn-snapshot-name">{props.value}</span>;
  }

  return (
    <span
      className="bn-snapshot-name-sizer"
      data-value={props.value === "" ? props.placeholder : props.value}
    >
      <ShadCNComponents.Input.Input
        ref={props.inputRef}
        className="bn-snapshot-name h-auto shadow-none focus-visible:ring-0"
        type="text"
        value={props.value}
        placeholder={props.placeholder}
        aria-label={props["aria-label"]}
        onChange={props.onChange}
        onClick={props.onClick}
        onKeyDown={props.onKeyDown}
        onBlur={props.onBlur}
      />
    </span>
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
  const ShadCNComponents = useShadCNComponentsContext()!;

  return (
    <ShadCNComponents.Card.Card
      className={cn(
        className,
        "group relative mb-1 flex w-full cursor-pointer flex-col gap-1.5 overflow-visible rounded-lg border border-transparent px-3.5 py-3 text-card-foreground shadow-none transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
        (state === "selected" || state === "comparison-source") &&
          "selected bg-primary text-primary-foreground hover:bg-primary focus-visible:-outline-offset-4 focus-visible:outline-primary-foreground",
        state === "comparison-baseline" && "comparing bg-primary/10",
        (state === "comparison-source" || state === "comparison-baseline") &&
          "border-primary ring-1 ring-primary",
      )}
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
        <div className="bn-snapshot-comparing-to text-primary dark:text-primary flex items-center gap-1 text-[13px] font-semibold">
          {comparingIcon}
          <span>{comparingLabel}</span>
        </div>
      )}
      <div className="bn-snapshot-body flex flex-col gap-0.5 text-[13px]">
        <div className="bn-snapshot-title-row flex min-h-5 min-w-0 items-center gap-1.5 pr-5">
          {name}
        </div>
        {date && <div className="bn-snapshot-date leading-[1.3]">{date}</div>}
        {restoredFrom && (
          <div className="bn-snapshot-original-date text-muted-foreground leading-[1.3]">
            {restoredFrom}
          </div>
        )}
        {secondaryLabel && (
          <div className="bn-snapshot-secondary-label text-muted-foreground leading-[1.3]">
            {secondaryLabel}
          </div>
        )}
      </div>
      {actions && (
        <div
          className="bn-snapshot-menu absolute top-2 right-2 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 group-focus-visible:opacity-100"
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        >
          {actions}
        </div>
      )}
    </ShadCNComponents.Card.Card>
  );
});
