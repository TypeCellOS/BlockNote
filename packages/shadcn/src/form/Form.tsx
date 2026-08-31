import { assertEmpty } from "@blocknote/core";
import { ComponentProps } from "@blocknote/react";

export const Form = (props: ComponentProps["Generic"]["Form"]["Root"]) => {
  const { children, onSubmit, ...rest } = props;

  assertEmpty(rest);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit?.();
      }}
    >
      {children}
    </form>
  );
};
