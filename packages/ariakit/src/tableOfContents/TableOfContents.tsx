import { Button as AriakitButton } from "@ariakit/react";
import { assertEmpty } from "@blocknote/core";
import { type ComponentProps } from "@blocknote/react";

export function Root(props: ComponentProps["TableOfContents"]["Root"]) {
  const { className, title, children, ...rest } = props;
  assertEmpty(rest, false);

  return (
    <nav className={className} aria-label={title}>
      <p className="bn-table-of-contents-title">{title}</p>
      {children}
    </nav>
  );
}

export function Item(props: ComponentProps["TableOfContents"]["Item"]) {
  const { className, depth, isActive, onClick, children, ...rest } = props;
  assertEmpty(rest, false);

  return (
    <AriakitButton
      className={className}
      style={{ paddingInlineStart: 12 + depth * 12 }}
      aria-current={isActive ? "location" : undefined}
      onClick={onClick}
    >
      {children}
    </AriakitButton>
  );
}
