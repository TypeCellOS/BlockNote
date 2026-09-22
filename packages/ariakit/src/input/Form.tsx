import { FormProvider as AriakitFormProvider } from "@ariakit/react";

import { assertEmpty } from "@blocknote/core";
import { ComponentProps } from "@blocknote/react";

export const Form = (props: ComponentProps["Generic"]["Form"]["Root"]) => {
  const { children, onSubmit, submitButton, ...rest } = props;

  assertEmpty(rest);

  return (
    <AriakitFormProvider>
      <form
        className={"bn-form"}
        onSubmit={(event) => {
          // These forms have no action — a real submission would navigate.
          event.preventDefault();
          onSubmit?.();
        }}
      >
        {children}
        {submitButton === "none" ? null : submitButton}
      </form>
    </AriakitFormProvider>
  );
};
