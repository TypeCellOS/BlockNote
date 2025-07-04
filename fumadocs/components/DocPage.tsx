import ThemedImage from "@/components/ThemedImage";
import { getMDXComponents } from "@/util/mdx-components";
import { getPageTreePeers } from "fumadocs-core/server";
import { LoaderOutput } from "fumadocs-core/source";
import { Card, Cards } from "fumadocs-ui/components/card";
import { createRelativeLink } from "fumadocs-ui/mdx";
import { DocsBody, DocsPage, DocsTitle } from "fumadocs-ui/page";
import { notFound } from "next/navigation";

export function CardTable({
  path,
  source,
}: {
  path: string;
  source: LoaderOutput<{ i18n: false; source: any }>;
}) {
  return (
    <Cards>
      {getPageTreePeers(source.pageTree, `/docs/${path}`).map((peer) => (
        <Card key={peer.url} title={peer.name} href={peer.url}>
          {peer.description}
        </Card>
      ))}
    </Cards>
  );
}

export async function DocPage(props: {
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
      // footer: null forces ToC to be visible with no items
      tableOfContent={{ style: "clerk", footer: null }}
      toc={page.data.toc}
      full={page.data.full}
    >
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsBody>
        <MDXContent
          components={getMDXComponents({
            // this allows you to link to other pages with relative file paths
            a: createRelativeLink(props.source, page),
            CardTable: (cardProps) => (
              <CardTable source={props.source} path={cardProps.path} />
            ),
            ThemedImage,
          })}
        />
      </DocsBody>
    </DocsPage>
  );
}
