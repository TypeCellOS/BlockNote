import { CustomDocsLayout } from "@/components/CustomDocsLayout";
import { source } from "@/lib/source/docs";

export default function Layout({ children }: LayoutProps<"/docs">) {
  return (
    <CustomDocsLayout tree={source.getPageTree()}>{children}</CustomDocsLayout>
  );
}
