import CTAButton from "@/components/CTAButton";
import Example from "@/components/Example";
import ThemedImage from "@/components/ThemedImage";
import { getExampleData } from "@/lib/getExampleData";
import * as Twoslash from "fumadocs-twoslash/ui";
import {
  createFileSystemGeneratorCache,
  createGenerator,
} from "fumadocs-typescript";
import { AutoTypeTable } from "fumadocs-typescript/ui";
import * as TabsComponents from "fumadocs-ui/components/tabs";
import { TypeTable } from "fumadocs-ui/components/type-table";
import defaultMdxComponents from "fumadocs-ui/mdx";
import type { MDXComponents } from "mdx/types";
import { Suspense } from "react";
import GitHubButton from "./components/GitHubButton";

const generator = createGenerator({
  // set a cache, necessary for serverless platform like Vercel
  cache: createFileSystemGeneratorCache(".next/fumadocs-typescript"),
});

export function getMDXComponents(components?: MDXComponents): MDXComponents {
  return {
    ...defaultMdxComponents,
    ...Twoslash,
    Example: (props: { name: string }) => {
      const [exampleGroupName, exampleName] = props.name.split("/");

      return (
        <Suspense fallback={null}>
          <Example
            exampleData={getExampleData(exampleGroupName, exampleName)}
          />
        </Suspense>
      );
    },
    ...TabsComponents,
    ThemedImage: ThemedImage,
    TypeTable: TypeTable,
    AutoTypeTable: (props) => (
      <AutoTypeTable {...props} generator={generator} />
    ),
    CTAButton,
    GitHubButton,
    CardTable: (props: any) => <div>TODO</div>,
    ...components,
  };
}
