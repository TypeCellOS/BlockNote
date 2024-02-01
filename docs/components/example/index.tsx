// import * as App from "../../../../examples/basic/App";

import { examples } from "./generated/examples.gen";

// const App = dynamic(
//   () =>
//     //import("../../../test"), {
//     import("../../../examples/basic/App"),
//   {
//     ssr: false,
//   }
// );

// const App2 = dynamic(
//   () =>
//     //import("../../../test"), {
//     import("../../../examples/basic/App2"),
//   {
//     ssr: false,
//   }
// );

// import { examples } from "../../../playground/src/examples.gen";

// const examplesFlattened = examples.flatMap((e) => e.projects);

export function Example(props: { name: keyof typeof examples }) {
  // const example = examplesFlattened.find((e) => e.slug === props.name);
  // if (!example) {
  //   throw new Error("invalid example");
  // }
  const example = examples[props.name];
  const ExampleWithCode = example.ExampleWithCode;

  return <ExampleWithCode name={props.name} />;
}
