import { ComponentProps } from "@blocknote/react";

import { useShadCNComponentsContext } from "../ShadCNComponentsContext";
import { useForm } from "react-hook-form";

export const Form = (props: ComponentProps["Generic"]["Form"]["Root"]) => {
  const { children } = props;

  const ShadCNComponents = useShadCNComponentsContext()!;

  const form = useForm();

  return (
    <ShadCNComponents.Form.Form {...form}>
      {children}
    </ShadCNComponents.Form.Form>
  );
};
