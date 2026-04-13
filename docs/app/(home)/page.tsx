import { createHighlighter } from "shiki";
import { HomeContent } from "./_components/HomeContent";
import { codeSamples } from "./code-samples";

const highlighter = await createHighlighter({
  themes: ["github-dark"],
  langs: ["typescript", "tsx"],
});

export default async function Home() {
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
    // types: highlighter.codeToHtml(codeSamples.types, {
    //   lang: "typescript",
    //   theme: "github-dark",
    //   meta: { __raw: "twoslash" },
    //   transformers: [transformerTwoslash()],
    // }),
  };

  return <HomeContent code={highlightedCode} />;
}
