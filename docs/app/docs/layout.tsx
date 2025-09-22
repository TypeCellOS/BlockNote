import { baseOptions } from "@/app/layout.config";
import { CustomDocsLayout } from "@/components/CustomDocsLayout";
import { Footer } from "@/components/Footer";
import { source } from "@/lib/source/docs";
import type { ReactNode } from "react";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <>
      <CustomDocsLayout tree={source.pageTree} {...baseOptions}>
        {children}
      </CustomDocsLayout>
      <Footer />
    </>
  );
}
