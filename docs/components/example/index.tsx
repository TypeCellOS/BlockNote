import { useSession } from "next-auth/react";
import { getProLevel } from "../../util/authUtil";
import { examples } from "./generated/exampleComponents.gen";

export function Example(props: { name: keyof typeof examples }) {
  const session = useSession();
  const example = examples[props.name];
  if (!example) {
    throw new Error(`Example ${props.name} not found`);
  }
  const ExampleWithCode = example.ExampleWithCode;
  const userStatus = getProLevel(session);

  return (
    <ExampleWithCode
      name={props.name}
      isProExample={example.pro ? { userStatus } : undefined}
    />
  );
}
