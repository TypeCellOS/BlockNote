import { HomeLayout } from "fumadocs-ui/layouts/home";
import type { ReactNode } from "react";
import { baseOptions } from "@/app/layout.config";
import { Footer } from "@/components/Footer";
import * as Sentry from "@sentry/nextjs";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <>
      <HomeLayout {...baseOptions}>
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
            scope.setTag("page", "legal/terms-and-conditions");
          }}
        >
          {children}
        </Sentry.ErrorBoundary>
      </HomeLayout>
      <Footer />
    </>
  );
}
