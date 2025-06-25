import { LoaderOutput } from "fumadocs-core/source";

import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
} from "fumadocs-ui/page";
import { notFound } from "next/navigation";
import { examples } from "@/.source";
import Example from "@/components/Example";
import ExampleCards from "@/components/ExampleCards";
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

  const exampleIsPro =
    examples.docs.find(
      (example) =>
        example._file.path.replace(/\.mdx$/, "") === params.slug?.join("/"),
    )?.isPro || false;

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
          <Example name={params.slug.join("/")} exampleIsPro={exampleIsPro} />
        ) : null}
      </DocsBody>
    </DocsPage>
  );
}
