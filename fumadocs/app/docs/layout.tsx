import { CustomDocsLayout } from "@/components/CustomDocsLayout";
import type { ReactNode } from "react";
import { baseOptions } from "@/app/layout.config";
import { Footer } from "@/components/Footer";
import { source } from "@/lib/source/docs";

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
