import { Features } from "./features/Features";
import { Hero } from "./hero/Hero";
import { Letter } from "./letter/Letter";

import { FadeIn } from "@/components/pages/landing/shared/FadeIn";
import FAQ from "./FAQ";
import "./gradients.css";
import "./styles.css";
import { Sponsors } from "@/components/pages/landing/sponsors/Sponsors";
import { Community } from "@/components/pages/landing/community/Community";

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
        <Community />
        {/*</GradientSectionBorder>*/}
        <FAQ />
      </main>
    </>
  );
}
