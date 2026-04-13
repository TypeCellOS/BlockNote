import { CustomDocsLayout } from "@/components/CustomDocsLayout";
import { ProBadge } from "@/components/ProBadge";
import { getExampleData } from "@/lib/getExampleData";
import { source } from "@/lib/source/examples";

export default function Layout({ children }: LayoutProps<"/docs">) {
  // Add Pro badges to example pages in sidebar. (bit hacky)
  for (const category of source.pageTree.children) {
    if (category.type === "folder") {
      for (const page of category.children) {
        if (page.type === "page" && page.$ref?.file) {
          const [exampleGroupName, exampleName] = page.$ref.file.split("/");

          const exampleData = getExampleData(
            exampleGroupName,
            exampleName.replace(".mdx", ""),
          );

          // eslint-disable-next-line
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
    <CustomDocsLayout tree={source.getPageTree()}>{children}</CustomDocsLayout>
  );
}
