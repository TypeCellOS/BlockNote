import Example from "@/components/Example";
import ExampleCards from "@/components/ExampleCards";
import { getExampleData } from "@/lib/getExampleData";
import { getFullMetadata } from "@/lib/getFullMetadata";
import { getPageImage, source } from "@/lib/source/examples";
import { getMDXComponents } from "@/mdx-components";
import { Heading } from "fumadocs-ui/components/heading";
import { DocsBody, DocsPage } from "fumadocs-ui/layouts/docs/page";
import { createRelativeLink } from "fumadocs-ui/mdx";
import type { Metadata } from "next";
import Link from "next/link";
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
        {!params.slug || params.slug.length === 0 ? (
          <div className="not-prose my-6 flex flex-col items-start justify-between gap-4 rounded-xl border border-purple-100 bg-purple-50/50 p-4 sm:flex-row sm:items-center sm:p-6">
            <div>
              <h3 className="text-base font-semibold text-purple-900">
                Interactive Playground
              </h3>
              <p className="text-sm text-stone-600">
                Try all features combined in our full-featured demo editor.
              </p>
            </div>
            <Link
              href="/demo"
              className="whitespace-nowrap rounded-full bg-purple-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-purple-700"
            >
              Try the Demo &rarr;
            </Link>
          </div>
        ) : null}
        <MDX
          components={getMDXComponents({
            // this allows you to link to other pages with relative file paths
            a: createRelativeLink(source, page),
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

export async function generateMetadata(
  props: PageProps<"/examples/[[...slug]]">,
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
