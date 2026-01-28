import { createHighlighter } from "shiki";
import { HomeContent } from "./_components/HomeContent";
import { codeSamples } from "./code-samples";

export default async function Home() {
  const highlighter = await createHighlighter({
    themes: ["github-dark"],
    langs: ["typescript", "tsx"],
  });

  const highlightedCode = {
    realtime: highlighter.codeToHtml(codeSamples.realtime, {
      lang: "typescript",
      theme: "github-dark",
    }),
    theming: highlighter.codeToHtml(codeSamples.theming, {
      lang: "tsx",
      theme: "github-dark",
    }),
    extend: highlighter.codeToHtml(codeSamples.extend, {
      lang: "tsx",
      theme: "github-dark",
    }),
  };

  return (
    <main className="relative">
      <HomeContent code={highlightedCode} />
    </main>
  );
}
