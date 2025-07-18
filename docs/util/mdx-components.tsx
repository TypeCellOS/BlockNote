import Example from "@/components/Example";
import ThemedImage from "@/components/ThemedImage";
import { getExampleData } from "@/util/getExampleData";
import { Tab, Tabs } from "fumadocs-ui/components/tabs";
import { TypeTable } from "fumadocs-ui/components/type-table";
import * as Twoslash from "fumadocs-twoslash/ui";
import defaultMdxComponents from "fumadocs-ui/mdx";
import type { MDXComponents } from "mdx/types";
import { Suspense } from "react";

// use this function to get MDX components, you will need it for rendering MDX
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
    Tabs: Tabs,
    Tab: Tab,
    ThemedImage: ThemedImage,
    TypeTable: TypeTable,
    ...components,
  } as any;
}
