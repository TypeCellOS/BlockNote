import * as Ariakit from "@ariakit/react";

import { ReactNode } from "react";

export const Form = (props: { children: ReactNode }) => {
  const { ...rest } = props;

  return <Ariakit.FormProvider {...rest} />;
};
