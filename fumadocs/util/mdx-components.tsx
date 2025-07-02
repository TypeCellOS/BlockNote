import { Tab, Tabs } from "fumadocs-ui/components/tabs";
import defaultMdxComponents from "fumadocs-ui/mdx";
import type { MDXComponents } from "mdx/types";
import { Suspense } from "react";

import Example from "@/components/Example";

// use this function to get MDX components, you will need it for rendering MDX
export function getMDXComponents(components?: MDXComponents): MDXComponents {
  return {
    ...defaultMdxComponents,
    Example: (props: { name: string }) => {
      const [exampleGroupName, exampleName] = props.name.split("/");

      return (
        <Suspense fallback={null}>
          <Example
            exampleGroupName={exampleGroupName}
            exampleName={exampleName}
          />
        </Suspense>
      );
    },
    Tabs: Tabs,
    Tab: Tab,
    ...components,
  } as any;
}
