import { hasAccessToProExamples } from "@/util/authUtil";
import { useSession } from "next-auth/react";
import { examples } from "./generated/exampleComponents.gen";

export function Example(props: { name: keyof typeof examples }) {
  const session = useSession();
  const example = examples[props.name];
  if (!example) {
    throw new Error(`Example ${props.name} not found`);
  }
  const ExampleWithCode = example.ExampleWithCode;

  if (!example.pro || hasAccessToProExamples(session)) {
    return <ExampleWithCode name={props.name} hideCode={false} />;
  } else {
    return <ExampleWithCode name={props.name} hideCode={true} />;
  }
}
