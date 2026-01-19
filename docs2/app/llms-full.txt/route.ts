import { getLLMText, sourceDocs } from "@/lib/source/docs";

export const revalidate = false;

export async function GET() {
  const scan = sourceDocs.getPages().map(getLLMText);
  const scanned = await Promise.all(scan);

  return new Response(scanned.join("\n\n"));
}
