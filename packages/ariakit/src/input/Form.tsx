import * as Ariakit from "@ariakit/react";

import { ComponentProps } from "@blocknote/react";

export const Form = (props: ComponentProps["Generic"]["Form"]["Root"]) => {
  const { children } = props;

  return <Ariakit.FormProvider>{children}</Ariakit.FormProvider>;
};
