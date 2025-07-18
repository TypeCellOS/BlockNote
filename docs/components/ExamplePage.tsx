import { LoaderOutput } from "fumadocs-core/source";
import { Heading } from "fumadocs-ui/components/heading";
import { DocsBody, DocsPage } from "fumadocs-ui/page";
import { notFound } from "next/navigation";

import Example from "@/components/Example";
import ExampleCards from "@/components/ExampleCards";
import { getMDXComponents } from "@/util/mdx-components";
import { getExampleData } from "@/util/getExampleData";

export async function ExamplePage(props: {
  params: Promise<{ slug?: string[] }>;
  source: LoaderOutput<any>;
}) {
  const params = await props.params;
  const page = props.source.getPage(params.slug);
  if (!page) {
    notFound();
  }

  const MDXContent = page.data.body;

  return (
    <DocsPage
      breadcrumb={{
        enabled: true,
        includeRoot: true,
        includePage: true,
        includeSeparator: true,
      }}
      tableOfContent={{ style: "clerk" }}
      toc={page.data.toc}
      full={page.data.full}
      container={{
        // Slight hack to force uniform padding for viewport sizes where the
        // ToC is hidden but the sidebar is still visible.
        className: "m-0 *:md:pl-12! *:md:pt-12! *:md:pr-4!",
      }}
    >
      <DocsBody>
        <Heading>{page.data.title}</Heading>
        <MDXContent components={getMDXComponents({ ExampleCards })} />
        {params.slug && params.slug.length > 0 ? (
          <Example
            exampleData={getExampleData(params.slug[0], params.slug[1])}
          />
        ) : null}
      </DocsBody>
    </DocsPage>
  );
}
