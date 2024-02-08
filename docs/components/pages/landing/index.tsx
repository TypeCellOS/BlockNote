import { LandingPageGlobalStyles } from "../home-shared/GlobalStyles";
import { GradientSectionBorder } from "../home-shared/GradientSectionBorder";
import { PackFeatures } from "./PackFeatures";
import { PackHero } from "./PackHero";
import { PackLetter } from "./PackLetter";

import "./gradient.css";
import { FadeIn } from "@/components/pages/home-shared/FadeIn";

// TODO: Cleanup
export function BlockNoteHome() {
  return (
    <>
      <LandingPageGlobalStyles />
      <main className="relative">
        <PackHero />
        <FadeIn noVertical>
          <div className={"section-border"} />
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
