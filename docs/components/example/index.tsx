import { useSession } from "next-auth/react";
// import { authClient } from "../../util/auth-client";
import { examples } from "./generated/exampleComponents.gen";
import { authClient } from "@/util/auth-client";

export function Example(props: { name: keyof typeof examples }) {
  // authClient.
  const session = authClient.useSession()
  // const session = useSession();
  const example = examples[props.name];
  if (!example) {
    throw new Error(`Example ${props.name} not found`);
  }
  const ExampleWithCode = example.ExampleWithCode;
  // const userStatus = getProLevel(session);

  return (
    <ExampleWithCode
      name={props.name}
      isProExample={example.pro ? true : undefined}
    />
  );
}
