import { baseOptions } from "@/app/layout.config";
import { CustomDocsLayout } from "@/components/CustomDocsLayout";
import { Footer } from "@/components/Footer";
import { ProBadge } from "@/components/ProBadge";
import { source } from "@/lib/source/examples";
import { getExampleData } from "@/util/getExampleData";
import type { ReactNode } from "react";
import * as Sentry from "@sentry/nextjs";

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
              <span className="mr-1">{exampleData.title}</span>
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
        <Sentry.ErrorBoundary
          fallback={
            <div>
              We encountered an error trying to show this page. Please report
              this to us on GitHub at{" "}
              <a href="https://github.com/TypeCellOS/BlockNote/issues">
                https://github.com/TypeCellOS/BlockNote/issues
              </a>
            </div>
          }
          beforeCapture={(scope) => {
            scope.setTag("type", "react-render");
            scope.setTag("page", "examples");
          }}
        >
          {children}
        </Sentry.ErrorBoundary>
      </CustomDocsLayout>
      <Footer />
    </>
  );
}
