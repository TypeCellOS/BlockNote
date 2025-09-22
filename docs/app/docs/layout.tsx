import type { ReactNode } from "react";
import { Analytics } from "@vercel/analytics/react";
import { baseOptions } from "@/app/layout.config";
import { CustomDocsLayout } from "@/components/CustomDocsLayout";
import { Footer } from "@/components/Footer";
import { source } from "@/lib/source/docs";
import * as Sentry from "@sentry/nextjs";

export default function Layout({ children }: { children: ReactNode }) {
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
            scope.setTag("page", "docs");
          }}
        >
          {children}
        </Sentry.ErrorBoundary>
      </CustomDocsLayout>
      <Footer />
      <Analytics />
    </>
  );
}
