import { source } from "@/lib/source/docs";
import { source as sourceExamples } from "@/lib/source/examples";
import { getLLMText } from "@/lib/get-llm-text";

export const revalidate = false;

export async function GET() {
  const scan = source
    .getPages()
    .concat(sourceExamples.getPages())
    .map(getLLMText);
  const scanned = await Promise.all(scan);

  return new Response(scanned.join("\n\n"));
}
