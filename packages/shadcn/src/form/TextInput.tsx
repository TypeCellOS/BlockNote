import * as ShadCNInput from "../components/ui/input";
import * as ShadCNLabel from "../components/ui/label";

import { ComponentProps } from "@blocknote/react";
import { forwardRef } from "react";

import { useShadCNComponentsContext } from "../ShadCNComponentsContext";

export const TextInput = forwardRef(
  (
    props: ComponentProps["Generic"]["Form"]["TextInput"] &
      Partial<{
        Input: typeof ShadCNInput.Input;
        Label: typeof ShadCNLabel.Label;
      }>
  ) => {
    const {
      className,
      name,
      label,
      // icon,
      value,
      autoFocus,
      placeholder,
      onKeyDown,
      onChange,
      onSubmit,
    } = props;

    const ShadCNComponents = useShadCNComponentsContext();
    const Input = ShadCNComponents?.Input || ShadCNInput.Input;
    const Label = ShadCNComponents?.Label || ShadCNLabel.Label;

    if (!label) {
      return (
        <Input
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
        <Label htmlFor={label}>{label}</Label>
        <Input
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
