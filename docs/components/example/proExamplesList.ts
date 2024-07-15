import { EXAMPLES_LIST } from "@/components/example/generated/exampleList.gen";
import { examples } from "@/components/example/generated/exampleComponents.gen";

export const proExamplesList = ([] as (typeof EXAMPLES_LIST)[number]["items"])
  .concat(...EXAMPLES_LIST.map((example) => example.items))
  .filter((example) => {
    return examples[
      example.link.replace("/examples/", "") as keyof typeof examples
    ].pro;
  })
  .map((example) => example.text);
