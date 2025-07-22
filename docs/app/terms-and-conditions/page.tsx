import GitHubButton from "@/components/GitHubButton";
import CTAButton from "@/components/CTAButton";
import { source } from "@/lib/source/pages";
import { getFullMetadata } from "@/util/getFullMetadata";
import { getMDXComponents } from "@/util/mdx-components";
import { DocsBody } from "fumadocs-ui/page";
import { notFound } from "next/navigation";

export default async function TermsAndConditionsPage() {
  const page = source.getPage(["terms-and-conditions"]);
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

export async function generateMetadata() {
  const page = source.getPage(["terms-and-conditions"]);
  if (!page) {
    notFound();
  }

  return getFullMetadata({
    title: page.data.title,
    description: page.data.description,
    path: page.url,
    ogImageTitle: page.data.imageTitle,
  });
}
