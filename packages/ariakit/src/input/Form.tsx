import * as Ariakit from "@ariakit/react";

import { ComponentProps } from "@blocknote/react";

export const Form = (props: ComponentProps["Generic"]["Form"]["Root"]) => {
  const { ...rest } = props;

  return <Ariakit.FormProvider {...rest} />;
};
