import CTAButton from "@/components/CTAButton";
import { FadeIn } from "@/components/FadeIn";
import { HeroText } from "@/components/Headings";
import { Section } from "@/components/Section";
import gradients from "@/components/gradients.module.css";
import cn from "classnames";

export function Letter() {
  return (
    <Section gradientBackground className="pb-16 pt-12 xl:pb-24 xl:pt-16">
      <div
        className={
          "z-20 flex max-w-xl flex-col items-center gap-12 px-6 xl:gap-16"
        }
      >
        <FadeIn>
          <HeroText>Let&apos;s build</HeroText>
        </FadeIn>
        <FadeIn className="flex flex-col gap-3 leading-6 md:text-lg">
          <p>
            Building a modern, collaborative text editor is a complex
            engineering challenge that used to take months of work, deep
            technical expertise and a lot of patience - only within reach of the
            largest companies.
          </p>
          <p>
            Leveraging our expertise, we set out to save developers months of
            engineering work by creating a modern, batteries-included
            block-based text editor built on top of industry standards like
            Prosemirror and Yjs (used by giants like NY Times, Atlassian,
            Wordpress, Gitlab and many others).
          </p>
          <p>Enter BlockNote.</p>
          <p>
            BlockNote eliminates the need to deal with low-level details around
            text positions and document structure. Instead, work with the
            strongly typed, block-based API to work with your editor and
            documents. You also get a full set of modern UI components
            out-of-the-box: no need to build all interface elements from
            scratch. With just a few lines of code, you can integrate a
            polished, collaborative text editor into your app.
          </p>
          <p>
            Supported by an active and growing community of companies and
            developers, we invite you to contribute, provide feedback, and
            partner with us to shape the future of rich text editing and
            collaborative software!
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
