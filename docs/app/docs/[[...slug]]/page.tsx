import { CardTable } from "@/components/CardTable";
import { getFullMetadata } from "@/lib/getFullMetadata";
import { getPageImage, source } from "@/lib/source/docs";
import { getMDXComponents } from "@/mdx-components";
import { DocsBody, DocsPage } from "fumadocs-ui/layouts/docs/page";
import { createRelativeLink } from "fumadocs-ui/mdx";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

export default async function Page(props: PageProps<"/docs/[[...slug]]">) {
  const params = await props.params;
  const page = source.getPage(params.slug);
  if (!page) notFound();

  const MDX = page.data.body;

  return (
    <DocsPage
      toc={page.data.toc}
      full={page.data.full}
      breadcrumb={{
        enabled: true,
        includeRoot: true,
        includePage: true,
        includeSeparator: true,
      }}
      tableOfContent={{ style: "clerk" }}
      // Removes the ToC dropdown on mobile views. Have to pass an empty
      // element as `null` renders the default dropdown.
      tableOfContentPopover={{ component: <></> }}
      className="md:pt-6 xl:pt-6"
    >
      {/* <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription>{page.data.description}</DocsDescription> */}
      <DocsBody>
        <MDX
          components={getMDXComponents({
            // this allows you to link to other pages with relative file paths
            a: createRelativeLink(source, page),
            CardTable: (props: any) => <CardTable {...props} source={source} />,
          })}
        />
      </DocsBody>
    </DocsPage>
  );
}

export async function generateStaticParams() {
  return source.generateParams();
}

export async function generateMetadata(
  props: PageProps<"/docs/[[...slug]]">,
): Promise<Metadata> {
  const params = await props.params;
  const page = source.getPage(params.slug);
  if (!page) notFound();

  return getFullMetadata({
    title: page.data.title,
    description: page.data.description,
    openGraphImages: getPageImage(page).url,
    path: page.url,
  });
}
