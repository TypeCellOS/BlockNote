import { LoaderOutput } from "fumadocs-core/source";

import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
} from "fumadocs-ui/page";
import { notFound } from "next/navigation";
import Example from "@/components/Example";
import ExampleCards from "@/components/ExampleCards";
import { exampleIsPro } from "@/util/exampleIsPro";
import { getMDXComponents } from "@/util/mdx-components";

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
      tableOfContent={{ style: "clerk" }}
      toc={page.data.toc}
      full={page.data.full}
    >
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription>{page.data.description}</DocsDescription>
      <DocsBody>
        <MDXContent components={getMDXComponents({ ExampleCards })} />
        {params.slug && params.slug.length > 0 ? (
          <Example
            name={params.slug.join("/")}
            exampleIsPro={exampleIsPro(params.slug.join("/"))}
          />
        ) : null}
      </DocsBody>
    </DocsPage>
  );
}
