import cn from "classnames";
import CTAButton from "@/components/pages/landing/shared/CTAButton";
import { Section } from "@/components/pages/landing/shared/Section";
import { FadeIn } from "@/components/pages/landing/shared/FadeIn";
import { HeroText } from "@/components/pages/landing/shared/Headings";
import gradients from "@/components/pages/landing/shared/gradients.module.css";

export function Letter() {
  return (
    <Section gradientBackground className="pb-16 pt-12 xl:pb-24 xl:pt-16">
      <div
        className={
          "z-20 flex max-w-xl flex-col items-center gap-12 px-6 xl:gap-16"
        }>
        <FadeIn>
          <HeroText>Let&apos;s build</HeroText>
        </FadeIn>
        <FadeIn className="flex flex-col leading-6 md:text-lg">
          <p>
            When we started building an Open Source Notion alternative, we
            figured: &quot;How hard can it be?&quot;. Pretty hard, it turns out.
            Text editors in 2024? More complex than we thought.
          </p>
          <br />
          <p>
            After going down many rabbit holes and becoming accidental wizards
            in Prosemirror (the industry standard used by giants like NY Times,
            Atlassian, Gitlab and many others), we figured that we could save
            other devs a lot of pain by creating a modern, batteries-included,
            block-based text editor on top of it.
          </p>
          <br />
          <p>
            We&apos;re excited to share BlockNote with you. No more dealing with
            low-level positions; use the strongly typed, block-based API to work
            with your editor and documents. No need to build all interface
            elements from scratch; it comes with modern UI components
            out-of-the-box. Now, you can add a rich text editor with a polished
            UX to your app with just a few lines of code.
          </p>
          <br />
          <p>
            It&apos;s early days, but the excitement is real. We&apos;re seeing
            a mix of companies, enthusiasts, and community heroes jumping in. As
            a community-led open source project, we&apos;re looking forward to
            your contributions, feedback, or collaboration!
          </p>
        </FadeIn>
        <FadeIn className="relative h-px w-full" noVertical viewTriggerOffset>
          <span className={cn("absolute h-px w-full", gradients.letterLine)} />
        </FadeIn>
        <FadeIn noVertical>
          <CTAButton href={"/docs"} hoverGlow={true}>
            Start Building
          </CTAButton>
        </FadeIn>
      </div>
    </Section>
  );
}
