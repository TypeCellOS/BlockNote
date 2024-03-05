import { Community } from "@/components/pages/landing/community/Community";
import { FadeIn } from "@/components/pages/landing/shared/FadeIn";
import { Hero } from "@/components/pages/landing/hero/Hero";
import { Features } from "@/components/pages/landing/features/Features";
import { Letter } from "@/components/pages/landing/letter/Letter";
import { FAQ } from "@/components/pages/landing/faq/FAQ";
import "@/components/pages/landing/gradients.css";
import "@/components/pages/landing/styles.css";

export function BlockNoteHome() {
  return (
    <>
      <main className="relative">
        <Hero />
        <FadeIn noVertical>
          <div className={"h-px w-full bg-gray-500 opacity-20"} />
        </FadeIn>
        <Features />
        <FadeIn noVertical>
          <div className={"section-border"} />
        </FadeIn>
        <Letter />
        <FadeIn noVertical>
          <div className={"section-border"} />
        </FadeIn>
        <Community />
        <FadeIn noVertical>
          <div className={"h-px w-full bg-gray-500 opacity-20"} />
        </FadeIn>
        <FAQ />
      </main>
    </>
  );
}
