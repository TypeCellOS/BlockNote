import * as Ariakit from "@ariakit/react";
import { assertEmpty } from "@blocknote/core";

import { ComponentProps } from "@blocknote/react";

export const Form = (props: ComponentProps["Generic"]["Form"]["Root"]) => {
  const { children, ...rest } = props;

  assertEmpty(rest);

  return <Ariakit.FormProvider>{children}</Ariakit.FormProvider>;
};
