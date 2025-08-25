import type { ReactNode } from "react";
import { Analytics } from "@vercel/analytics/react";
import { baseOptions } from "@/app/layout.config";
import { CustomDocsLayout } from "@/components/CustomDocsLayout";
import { Footer } from "@/components/Footer";
import { ProBadge } from "@/components/ProBadge";
import { source } from "@/lib/source/examples";
import { getExampleData } from "@/util/getExampleData";

export default function Layout({ children }: { children: ReactNode }) {
  // Add Pro badges to example pages in sidebar.
  for (const category of source.pageTree.children) {
    if (category.type === "folder") {
      for (const page of category.children) {
        if (page.type === "page" && page.$ref?.file) {
          const [exampleGroupName, exampleName] = page.$ref.file.split("/");

          const exampleData = getExampleData(
            exampleGroupName,
            exampleName.replace(".mdx", ""),
          );

          page.name = (
            <span>
              {exampleData.title}
              {exampleData.isPro && <ProBadge />}
            </span>
          );
        }
      }
    }
  }

  return (
    <>
      <CustomDocsLayout tree={source.pageTree} {...baseOptions}>
        {children}
      </CustomDocsLayout>
      <Footer />
      <Analytics />
    </>
  );
}
