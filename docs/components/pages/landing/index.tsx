import { Features } from "./features/Features";
import { Hero } from "./hero/Hero";
import { Letter } from "./letter/Letter";

import { FadeIn } from "@/components/pages/landing/shared/FadeIn";
import "./styles.css";
import "./gradients.css";

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
        {/*</GradientSectionBorder>*/}
        {/*<GradientSectionBorder>*/}
        <Letter />
        <FadeIn noVertical>
          <div className={"section-border"} />
        </FadeIn>
        {/*</GradientSectionBorder>*/}
      </main>
    </>
  );
}
