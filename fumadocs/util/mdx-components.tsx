import { Tab, Tabs } from "fumadocs-ui/components/tabs";
import defaultMdxComponents from "fumadocs-ui/mdx";
import type { MDXComponents } from "mdx/types";
import { Suspense } from "react";

import { examples, examplesMeta } from "@/.source";
import Example from "@/components/Example";
import { getCategories } from "./getCategories";

// use this function to get MDX components, you will need it for rendering MDX
export function getMDXComponents(components?: MDXComponents): MDXComponents {
  return {
    ...defaultMdxComponents,
    Example: (props: { name: string }) => {
      return (
        <Suspense fallback={null}>
          <Example
            name={props.name}
            categories={getCategories(examples, examplesMeta)}
          />
        </Suspense>
      );
    },
    Tabs: Tabs,
    Tab: Tab,
    ...components,
  } as any;
}
