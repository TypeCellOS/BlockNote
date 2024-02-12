import { LandingPageGlobalStyles } from "../home-shared/GlobalStyles";

import { PackFeatures } from "./PackFeatures";
import { PackHero } from "./PackHero";
import { PackLetter } from "./PackLetter";

import { FadeIn } from "@/components/pages/home-shared/FadeIn";
import "./gradients.css";

// TODO: Cleanup
export function BlockNoteHome() {
  return (
    <>
      <LandingPageGlobalStyles />
      <main className="relative">
        <PackHero />
        <FadeIn noVertical>
          {/* TODO: Fix border color */}
          <div className={"h-px w-full bg-gray-500 opacity-20"} />
        </FadeIn>
        {/*<GradientSectionBorder>*/}
        <PackFeatures />
        <FadeIn noVertical>
          <div className={"section-border"} />
        </FadeIn>
        {/*</GradientSectionBorder>*/}
        {/*<GradientSectionBorder>*/}
        <PackLetter />
        <FadeIn noVertical>
          <div className={"section-border"} />
        </FadeIn>
        {/*</GradientSectionBorder>*/}
      </main>
    </>
  );
}
