import { source } from "@/lib/source/pages";
import { getMDXComponents } from "@/util/mdx-components";
import { DocsBody, DocsDescription, DocsTitle } from "fumadocs-ui/page";
import { notFound } from "next/navigation";

export default async function Page() {
  const page = source.getPage(["about"]);
  console.log(source.getPageTree());
  if (!page) {
    notFound();
  }
  const MDXContent = page.data.body;

  return (
    <div className="mx-auto max-w-3xl pt-8">
      <DocsTitle className="text-center">{page.data.title}</DocsTitle>
      <DocsDescription className="text-center">
        {page.data.description}
      </DocsDescription>
      <DocsBody>
        <MDXContent components={getMDXComponents()} />
      </DocsBody>
    </div>
  );
}

export async function generateStaticParams() {
  return source.generateParams();
}

export async function generateMetadata() {
  const page = source.getPage(["thanks"]);
  if (!page) {
    notFound();
  }

  return {
    title: page.data.title,
    description: page.data.description,
  };
}
