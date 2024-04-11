import { ComponentProps } from "@blocknote/react";

export const Form = (props: ComponentProps["Generic"]["Form"]["Root"]) => {
  return <Form>{props.children}</Form>;
};
