import { LandingPageGlobalStyles } from "../home-shared/GlobalStyles";
import { GradientSectionBorder } from "../home-shared/GradientSectionBorder";
import { PackFeatures } from "./PackFeatures";
import { PackHero } from "./PackHero";
import { PackLetter } from "./PackLetter";

import "./gradients.css";
import "./styles.css";
import { FadeIn } from "@/components/pages/home-shared/FadeIn";

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
