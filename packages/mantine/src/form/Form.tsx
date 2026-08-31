import { assertEmpty } from "@blocknote/core";
import { ComponentProps, useDictionary } from "@blocknote/react";

export const Form = (props: ComponentProps["Generic"]["Form"]["Root"]) => {
  const { children, onSubmit, omitSubmitButton, ...rest } = props;
  const dict = useDictionary();

  assertEmpty(rest);

  return (
    <form
      onSubmit={(event) => {
        // These forms have no action — a real submission would navigate.
        event.preventDefault();
        onSubmit?.();
      }}
    >
      {children}
      {/*
        Gives the form a submit button, which is what makes Enter submit it at
        all once a caller renders more than one field (see the `onSubmit`
        contract in `ComponentsContext`). Visually hidden rather than absent,
        so assistive technology still has a labelled control to activate.
      */}
      {!omitSubmitButton && (
        <button className={"bn-form-submit"} tabIndex={-1} type={"submit"}>
          {dict.generic.form_submit}
        </button>
      )}
    </form>
  );
};
