import { FormProvider as AriakitFormProvider } from "@ariakit/react";

import { assertEmpty } from "@blocknote/core";
import { ComponentProps } from "@blocknote/react";

export const Form = (props: ComponentProps["Generic"]["Form"]["Root"]) => {
  const { children, ...rest } = props;

  assertEmpty(rest);

  return <AriakitFormProvider>{children}</AriakitFormProvider>;
};
