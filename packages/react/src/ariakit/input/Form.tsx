import * as Ariakit from "@ariakit/react";

export const Form = (props: { children: React.ReactNode }) => {
  const { ...rest } = props;

  return <Ariakit.FormProvider {...rest} />;
};
