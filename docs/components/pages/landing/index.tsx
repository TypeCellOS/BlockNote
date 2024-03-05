import { Community } from "@/components/pages/landing/community/Community";
import { FadeIn } from "@/components/pages/landing/shared/FadeIn";
import { Hero } from "@/components/pages/landing/hero/Hero";
import { Features } from "@/components/pages/landing/features/Features";
import { Letter } from "@/components/pages/landing/letter/Letter";
import { FAQ } from "@/components/pages/landing/faq/FAQ";
import "@/components/pages/landing/gradients.css";
import "@/components/pages/landing/styles.css";

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
        <Community />
        {/*</GradientSectionBorder>*/}
        <FadeIn noVertical>
          {/* TODO: Fix border color */}
          <div className={"h-px w-full bg-gray-500 opacity-20"} />
        </FadeIn>
        <FAQ />
      </main>
    </>
  );
}
