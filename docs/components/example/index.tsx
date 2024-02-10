import { examples } from "./generated/exampleComponents.gen";

export function Example(props: { name: keyof typeof examples }) {
  
  const example = examples[props.name];
  if (!example) {
    throw new Error(`Example ${props.name} not found`);
  }
  const ExampleWithCode = example.ExampleWithCode;

  return <ExampleWithCode name={props.name} />;
}
