import GitHubButton from "@/components/GitHubButton";
import CTAButton from "@/components/CTAButton";
import { source } from "@/lib/source/pages";
import { getMDXComponents } from "@/util/mdx-components";
import { DocsBody } from "fumadocs-ui/page";
import { notFound } from "next/navigation";

export default async function Page(props: {
  params: Promise<{ slug?: string[] }>;
}) {
  const slug = (await props.params).slug || [];
  const page = source.getPage(slug);
  if (!page) {
    notFound();
  }
  const MDXContent = page.data.body;

  return (
    <div className="mx-auto max-w-3xl pt-8">
      <DocsBody>
        <MDXContent
          components={getMDXComponents({
            GitHubButton,
            CTAButton,
          })}
        />
      </DocsBody>
    </div>
  );
}

export async function generateStaticParams() {
  return source.generateParams();
}

export async function generateMetadata(props: {
  params: Promise<{ slug?: string[] }>;
}) {
  const slug = (await props.params).slug || [];
  const page = source.getPage(slug);
  if (!page) {
    notFound();
  }

  return {
    title: page.data.title,
    description: page.data.description,
  };
}
