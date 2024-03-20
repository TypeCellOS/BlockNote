import * as Ariakit from "@ariakit/react";

export const Form = (props: Record<string, never>) => {
  const { ...rest } = props;

  return <Ariakit.FormProvider {...rest} />;
};
