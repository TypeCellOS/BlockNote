import { Features } from "./features/Features";
import { Hero } from "./hero/Hero";
import { Letter } from "./letter/Letter";

import { FadeIn } from "@/components/pages/landing/shared/FadeIn";
import { ContributorsSection } from "./Community";
import FAQ from "./FAQ";
import { Sponsors } from "./Sponsors";
import "./gradients.css";
import "./styles.css";

// TODO: Cleanup
export function BlockNoteHome() {
  return (
    <>
      <main className="relative">
        <Hero />
        <FadeIn noVertical>
          {/* TODO: Fix border color */}
          <div className={"h-px w-full bg-gray-500 opacity-20"} />
        </FadeIn>
        {/*<GradientSectionBorder>*/}
        <Features />

        <FadeIn noVertical>
          <div className={"section-border"} />
        </FadeIn>
        <Sponsors />
        {/*</GradientSectionBorder>*/}
        {/*<GradientSectionBorder>*/}
        <Letter />
        <FadeIn noVertical>
          <div className={"section-border"} />
        </FadeIn>
        <ContributorsSection />
        {/*</GradientSectionBorder>*/}
        <FAQ />
      </main>
    </>
  );
}
