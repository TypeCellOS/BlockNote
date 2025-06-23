import { Tab, Tabs } from "fumadocs-ui/components/tabs";
import defaultMdxComponents from "fumadocs-ui/mdx";
import type { MDXComponents } from "mdx/types";
import { Suspense } from "react";

import { Example } from "../components/example";

// use this function to get MDX components, you will need it for rendering MDX
export function getMDXComponents(components?: MDXComponents): MDXComponents {
  return {
    ...defaultMdxComponents,
    Example: (props: any) => (
      <Suspense fallback={null}>
        <Example {...props} />
      </Suspense>
    ),
    Tabs: Tabs,
    Tab: Tab,
    ...components,
  } as any;
}
