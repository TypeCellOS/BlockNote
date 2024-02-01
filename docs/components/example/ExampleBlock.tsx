import { examples } from "./generated/examples.gen";

export function ExampleBlock(props: {
  name: keyof typeof examples;
  children: any;
}) {
  // const example = examplesFlattened.find((e) => e.slug === props.name);
  // if (!example) {
  //   throw new Error("invalid example");
  // }
  const example = examples[props.name];
  const App = example.App;

  return (
    <div className="shadow-md">
      {props.children}
      <App />
    </div>
  );
}
