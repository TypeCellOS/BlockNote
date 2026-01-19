import * as docs from "@/lib/source/docs";
import * as examples from "@/lib/source/examples";

export const revalidate = false;

export async function GET() {
  const sources = [docs, examples];
  const texts = sources.flatMap((source) => {
    const pages = source.source.getPages();
    return pages.map((page) => source.getLLMText(page));
  });

  const scanned = await Promise.all(texts);

  return new Response(scanned.join("\n\n"));
}
