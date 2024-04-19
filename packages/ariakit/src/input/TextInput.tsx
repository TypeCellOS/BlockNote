import * as Ariakit from "@ariakit/react";

import { ComponentProps } from "@blocknote/react";
import { mergeCSSClasses } from "@blocknote/core";

export const TextInput = (
  props: ComponentProps["Generic"]["Form"]["TextInput"]
) => {
  const {
    className,
    name,
    label,
    icon,
    value,
    autoFocus,
    placeholder,
    onKeyDown,
    onChange,
    onSubmit,
  } = props;

  return (
    <>
      {props.label && (
        <Ariakit.FormLabel name={name}>{label}</Ariakit.FormLabel>
      )}
      <div className="input-wrapper">
        {icon}
        <Ariakit.FormInput
          className={mergeCSSClasses("input", className || "")}
          name={name}
          value={value}
          autoFocus={autoFocus}
          placeholder={placeholder}
          onKeyDown={onKeyDown}
          onChange={onChange}
          onSubmit={onSubmit}
        />
      </div>
    </>
  );
};
