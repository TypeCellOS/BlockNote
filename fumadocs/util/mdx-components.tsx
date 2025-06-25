import { Tab, Tabs } from "fumadocs-ui/components/tabs";
import defaultMdxComponents from "fumadocs-ui/mdx";
import type { MDXComponents } from "mdx/types";
import { Suspense } from "react";

import { examples } from "@/.source";
import Example from "@/components/Example";

// use this function to get MDX components, you will need it for rendering MDX
export function getMDXComponents(components?: MDXComponents): MDXComponents {
  return {
    ...defaultMdxComponents,
    Example: (props: { name: string }) => {
      const exampleIsPro =
        examples.docs.find(
          (example) => example._file.path.replace(/\.mdx$/, "") === props.name,
        )?.isPro || false;

      return (
        <Suspense fallback={null}>
          <Example name={props.name} exampleIsPro={exampleIsPro} />
        </Suspense>
      );
    },
    Tabs: Tabs,
    Tab: Tab,
    ...components,
  } as any;
}
