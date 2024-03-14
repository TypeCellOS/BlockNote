import { FileInput } from "@mantine/core";
import { ComponentPropsWithoutRef, forwardRef, ReactNode } from "react";

export const ImagePanelFileInput = forwardRef<
  HTMLButtonElement,
  Omit<
    ComponentPropsWithoutRef<"button">,
    "value" | "defaultValue" | "onChange"
  > & {
    placeholder?: ReactNode;
    value?: File | null;
    defaultValue?: File | null;
    onChange?: (payload: File | null) => void;
  }
>((props, ref) => (
  <FileInput size={"xs"} {...props} ref={ref} data-test={"upload-input"} />
));
