import { Tab, Tabs } from "fumadocs-ui/components/tabs";
import defaultMdxComponents from "fumadocs-ui/mdx";
import type { MDXComponents } from "mdx/types";
import { Suspense } from "react";

import { Example } from "../components/example";
import { ThemedImage } from "../components/ThemedImage";
import { TypeTable } from "fumadocs-ui/components/type-table";

// use this function to get MDX components, you will need it for rendering MDX
export function getMDXComponents(components?: MDXComponents): MDXComponents {
  return {
    ...defaultMdxComponents,
    Example: (props: any) => (
      <Suspense fallback={null}>
        <Example {...props} />
      </Suspense>
    ),
    ThemedImage: ThemedImage,
    Tabs: Tabs,
    Tab: Tab,
    TypeTable: TypeTable,
    ...components,
  } as any;
}
