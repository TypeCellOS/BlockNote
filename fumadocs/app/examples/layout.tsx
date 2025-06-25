import { DocsLayout } from "fumadocs-ui/layouts/notebook";
import type { ReactNode } from "react";
import { baseOptions } from "@/app/layout.config";
import { Footer } from "@/components/Footer";
import { source } from "@/lib/source/examples";
import { examples } from "@/.source";
import { ProBadge } from "@/components/ProBadge";

export default function Layout({ children }: { children: ReactNode }) {
  // Add Pro badges to example pages in sidebar.
  for (const category of source.pageTree.children) {
    if (category.type === "folder") {
      for (const page of category.children) {
        if (page.type === "page") {
          const exampleIsPro =
            examples.docs.find(
              (example) =>
                example._file.path.replace(/\.mdx$/, "") === page.$ref?.file,
            )?.isPro || false;

          if (exampleIsPro) {
            page.icon = <ProBadge />;
          }
        }
      }
    }
  }

  return (
    <DocsLayout tree={source.pageTree} {...baseOptions}>
      {children}
      <Footer />
    </DocsLayout>
  );
}
