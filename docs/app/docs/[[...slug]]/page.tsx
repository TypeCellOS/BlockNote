import { DocPage } from "@/components/DocPage";
import { source } from "@/lib/source/docs";
import { getFullMetadata } from "@/util/getFullMetadata";
import { notFound } from "next/navigation";

export default async function Page(props: {
  params: Promise<{ slug?: string[] }>;
}) {
  return <DocPage {...props} source={source} />;
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
    ogImageTitle: page.data.imageTitle || page.data.title,
  });
}
