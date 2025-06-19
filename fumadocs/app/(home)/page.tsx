import { FadeIn } from "@/components/FadeIn";
import { FAQ } from "./faq/FAQ";
import { Community } from "./community/Community";
import { Features } from "./features/Features";
import { Hero } from "./hero/Hero";
import { Letter } from "./letter/Letter";

import "./gradients.css";

export default function Home() {
  return (
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
  );
}
