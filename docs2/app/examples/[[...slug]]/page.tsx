import Example from "@/components/Example";
import ExampleCards from "@/components/ExampleCards";
import { getExampleData } from "@/lib/getExampleData";
import { getPageImage, source } from "@/lib/source/examples";
import { getMDXComponents } from "@/mdx-components";
import { Heading } from "fumadocs-ui/components/heading";
import { DocsBody, DocsPage } from "fumadocs-ui/layouts/docs/page";
import { createRelativeLink } from "fumadocs-ui/mdx";

import type { Metadata } from "next";
import { notFound } from "next/navigation";

export default async function Page(props: PageProps<"/examples/[[...slug]]">) {
  const params = await props.params;
  const page = source.getPage(params.slug);
  if (!page) {
    notFound();
  }

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
      tableOfContent={{ enabled: false }}
      // container={{
      //   // Slight hack to force uniform padding for viewport sizes where the
      //   // ToC is hidden but the sidebar is still visible.
      //   className: "m-0 *:md:pl-12! *:md:pt-12! *:md:pr-4!",
      // }}
      // Removes the ToC dropdown on mobile views. Have to pass an empty
      // element as `null` renders the default dropdown.
      tableOfContentPopover={{ component: <></> }}
      className="md:pt-6 xl:pt-6"
    >
      <DocsBody>
        <Heading>{page.data.title}</Heading>
        <MDX
          components={getMDXComponents({
            // this allows you to link to other pages with relative file paths
            a: createRelativeLink(source, page),
            // TODO:, what was CardTable here?
            ExampleCards,
          })}
        />
        {params.slug && params.slug.length > 0 ? (
          <Example
            exampleData={getExampleData(params.slug[0], params.slug[1])}
          />
        ) : null}
      </DocsBody>
    </DocsPage>
  );
}

export async function generateStaticParams() {
  return source.generateParams();
}

// TODO
export async function generateMetadata(
  props: PageProps<"/docs/[[...slug]]">,
): Promise<Metadata> {
  const params = await props.params;
  const page = source.getPage(params.slug);
  if (!page) notFound();

  return {
    title: page.data.title,
    description: page.data.description,
    openGraph: {
      images: getPageImage(page).url,
    },
    // TODO: imagetitle?
    // TODO: path?
  };
}
