import { ExamplePage } from "@/components/ExamplePage";
import { source } from "@/lib/source/examples";
import { getFullMetadata } from "@/util/getFullMetadata";
import { notFound } from "next/navigation";

export default async function Page(props: {
  params: Promise<{ slug?: string[] }>;
}) {
  return <ExamplePage {...props} source={source} />;
}

export async function generateStaticParams() {
  return source.generateParams();
}

export async function generateMetadata(props: {
  params: Promise<{ slug?: string[] }>;
}) {
  const params = await props.params;
  const page = source.getPage(params.slug);
  if (!page) {
    notFound();
  }

  return getFullMetadata({
    title: page.data.title,
    description: page.data.description,
    path: page.url,
    ogImageTitle: page.data.title,
  });
}
