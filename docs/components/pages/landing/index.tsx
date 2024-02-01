import { LandingPageGlobalStyles } from "../home-shared/GlobalStyles";
import { GradientSectionBorder } from "../home-shared/GradientSectionBorder";
import { PackFeatures } from "./PackFeatures";
import { PackHero } from "./PackHero";
import { PackLetter } from "./PackLetter";

export function BlockNoteHome() {
  return (
    <>
      <LandingPageGlobalStyles />
      <main className="relative">
        <PackHero />
        <GradientSectionBorder>
          <PackFeatures />
        </GradientSectionBorder>
        <GradientSectionBorder>
          <PackLetter />
        </GradientSectionBorder>
      </main>
    </>
  );
}
