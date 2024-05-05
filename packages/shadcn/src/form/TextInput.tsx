import { ComponentProps } from "@blocknote/react";
import { forwardRef } from "react";

import { assertEmpty } from "@blocknote/core";
import { useShadCNComponentsContext } from "../ShadCNComponentsContext";

export const TextInput = forwardRef(
  (props: ComponentProps["Generic"]["Form"]["TextInput"]) => {
    const {
      className,
      name,
      label,
      icon, // TODO: implement
      value,
      autoFocus,
      placeholder,
      onKeyDown,
      onChange,
      onSubmit,
      ...rest
    } = props;

    assertEmpty(rest);

    const ShadCNComponents = useShadCNComponentsContext()!;

    if (!label) {
      return (
        <ShadCNComponents.Input.Input
          aria-label={name}
          name={name}
          autoFocus={autoFocus}
          placeholder={placeholder}
          value={value}
          onKeyDown={onKeyDown}
          onChange={onChange}
          onSubmit={onSubmit}
        />
      );
    }

    return (
      <div>
        <ShadCNComponents.Label.Label htmlFor={label}>
          {label}
        </ShadCNComponents.Label.Label>
        <ShadCNComponents.Input.Input
          className={className}
          id={label}
          name={name}
          autoFocus={autoFocus}
          placeholder={placeholder}
          value={value}
          onKeyDown={onKeyDown}
          onChange={onChange}
          onSubmit={onSubmit}
        />
      </div>
    );
  }
);
