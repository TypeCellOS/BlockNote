import { getLLMText, source } from "@/lib/source/docs";
import type { NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.endsWith(".md")) {
    return;
  }

  const slug = pathname.slice(0, -3).split("/").filter(Boolean).slice(1);

  const page = source.getPage(slug);
  if (!page) {
    return new Response("Not Found", { status: 404 });
  }

  const markdown = await getLLMText(page);

  return new Response(markdown, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
    },
  });
}

export const config = {
  matcher: ["/docs/:path*", "/docs", "/docs.md"],
};
