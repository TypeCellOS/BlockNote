import { getLLMText, source } from "@/lib/source/docs";
import { type NextRequest, NextResponse } from "next/server";

import { notFound } from "next/navigation";

// TODO: why force-dynamic!?
export const dynamic = "force-dynamic";
export const revalidate = false;

// TODO: review use of llms.mdx
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug?: string[] }> },
) {
  const slug = (await params).slug;
  const page = source.getPage(slug);
  if (!page) {
    notFound();
  }

  return new NextResponse(await getLLMText(page));
}

export function generateStaticParams() {
  return source.generateParams();
}
