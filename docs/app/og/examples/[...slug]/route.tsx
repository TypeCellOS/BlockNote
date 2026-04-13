import { getPageImage, source } from "@/lib/source/examples";
import { notFound } from "next/navigation";
import { ogImageResponse } from "../../ogImageResponse";

export const revalidate = false;

export async function GET(
  _req: Request,
  { params }: RouteContext<"/og/docs/[...slug]">,
) {
  const { slug } = await params;
  const page = source.getPage(slug.slice(0, -1));
  if (!page || slug[slug.length - 1] !== "image.png") notFound();

  let title = page.data.imageTitle || page.data.title;

  return ogImageResponse(title);
}

export function generateStaticParams() {
  return source.getPages().map((page) => ({
    lang: page.locale,
    slug: getPageImage(page).segments,
  }));
}
