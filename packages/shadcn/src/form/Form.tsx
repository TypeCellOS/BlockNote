import { ComponentProps } from "@blocknote/react";

import { assertEmpty } from "@blocknote/core";
import { useForm } from "react-hook-form";
import { useShadCNComponentsContext } from "../ShadCNComponentsContext";

export const Form = (props: ComponentProps["Generic"]["Form"]["Root"]) => {
  const { children, ...rest } = props;

  assertEmpty(rest);

  const ShadCNComponents = useShadCNComponentsContext()!;

  const form = useForm();

  return (
    <ShadCNComponents.Form.Form {...form}>
      {children}
    </ShadCNComponents.Form.Form>
  );
};
