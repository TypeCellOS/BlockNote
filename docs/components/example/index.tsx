import { authClient } from "@/util/auth-client";
import { examples } from "./generated/exampleComponents.gen";

export function Example(props: { name: keyof typeof examples }) {
  const session = authClient.useSession();
  const example = examples[props.name];
  if (!example) {
    throw new Error(`Example ${props.name} not found`);
  }
  const ExampleWithCode = example.ExampleWithCode;

  return (
    <ExampleWithCode
      // @ts-ignore
      name={props.name}
      isProExample={
        example.pro ? { userStatus: session.data?.planType } : undefined
      }
    />
  );
}
