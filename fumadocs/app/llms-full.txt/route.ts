import { source } from "@/lib/source/docs";
import { source as sourceExamples } from "@/lib/source/examples";
import { getLLMText, LLMData } from "@/lib/get-llm-text";

export const revalidate = false;

export async function GET() {
  const docsPages: LLMData[] = source
    .getPages()
  const examplesPages: LLMData[] = sourceExamples
    .getPages()
  const llmText = docsPages.concat(examplesPages).map(getLLMText)

  const scanned = await Promise.all(llmText);

  return new Response(scanned.join("\n\n"));
}
