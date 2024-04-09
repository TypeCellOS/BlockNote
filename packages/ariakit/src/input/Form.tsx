import * as Ariakit from "@ariakit/react";

import { FormProps } from "@ariakit/react";

export const Form = (props: FormProps) => {
  const { ...rest } = props;

  return <Ariakit.FormProvider {...rest} />;
};
