import { Group as AriakitGroup } from "@ariakit/react";
import { assertEmpty, mergeCSSClasses } from "@blocknote/core";
import { type ComponentProps } from "@blocknote/react";
import { forwardRef } from "react";

export const Sidebar = forwardRef<
  HTMLDivElement,
  ComponentProps["Versioning"]["Sidebar"]
>((props, ref) => {
  const { className, children, "aria-label": ariaLabel, ...rest } = props;
  assertEmpty(rest, false);

  return (
    <AriakitGroup
      className={className}
      ref={ref}
      role="region"
      aria-label={ariaLabel}
    >
      {children}
    </AriakitGroup>
  );
});

export function Header(props: ComponentProps["Versioning"]["Header"]) {
  const { className, title, actions, closeAction, ...rest } = props;
  assertEmpty(rest, false);

  return (
    <AriakitGroup className={className}>
      <AriakitGroup className="bn-versioning-sidebar-header-title">
        <h2 className="bn-versioning-sidebar-title">{title}</h2>
        {actions}
      </AriakitGroup>
      {closeAction}
    </AriakitGroup>
  );
}

export function Name(props: ComponentProps["Versioning"]["Name"]) {
  if (props.mode === "display") {
    return <span className="bn-snapshot-name">{props.value}</span>;
  }

  return (
    <span
      className="bn-snapshot-name-sizer"
      data-value={props.value === "" ? props.placeholder : props.value}
    >
      <input
        ref={props.inputRef}
        className="bn-snapshot-name"
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
  const snapshotStateClass = (
    {
      default: "",
      selected: "selected",
      "comparison-source": "selected bn-snapshot-comparison-source",
      "comparison-baseline": "comparing",
    } satisfies Record<typeof state, string>
  )[state];

  return (
    <AriakitGroup
      className={mergeCSSClasses(
        className,
        "bn-ak-hovercard",
        snapshotStateClass,
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
        <div className="bn-snapshot-comparing-to">
          {comparingIcon}
          <span>{comparingLabel}</span>
        </div>
      )}
      <div className="bn-snapshot-body">
        <div className="bn-snapshot-title-row">{name}</div>
        {date && <div className="bn-snapshot-date">{date}</div>}
        {restoredFrom && (
          <div className="bn-snapshot-original-date">{restoredFrom}</div>
        )}
        {secondaryLabel && (
          <div className="bn-snapshot-secondary-label">{secondaryLabel}</div>
        )}
      </div>
      {actions && (
        <div
          className="bn-snapshot-menu"
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        >
          {actions}
        </div>
      )}
    </AriakitGroup>
  );
});
