import { getMDXComponents } from "@/util/mdx-components";
import { getPageTreePeers } from "fumadocs-core/server";
import { LoaderOutput } from "fumadocs-core/source";
import { Card, Cards } from "fumadocs-ui/components/card";
import { createRelativeLink } from "fumadocs-ui/mdx";
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
} from "fumadocs-ui/page";
import { notFound } from "next/navigation";

export function CardTable({
  baseUrl,
  path,
  source,
}: {
  baseUrl: string;
  path: string;
  source: LoaderOutput<{ i18n: false; source: any }>;
}) {
  return (
    <Cards>
      {getPageTreePeers(
        source.pageTree,
        `${baseUrl}/${path.startsWith("/") ? path.slice(1) : path}`,
      ).map((peer) => (
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
  baseUrl: string;
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
        <MDXContent
          components={getMDXComponents({
            // this allows you to link to other pages with relative file paths
            // @ts-ignore
            a: createRelativeLink(props.source, page),
            CardTable: (cardProps: any) => (
              <CardTable
                baseUrl={props.baseUrl}
                source={props.source}
                {...cardProps}
              />
            ),
            MadeByTable: () => <div>THIS TABLE IS NOT YET IMPLEMENTED</div>,
          })}
        />
      </DocsBody>
    </DocsPage>
  );
}
