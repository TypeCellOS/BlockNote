import {
  HeroText,
  SectionSubtext,
} from "@/components/pages/landing/shared/Headings";
import { CTAButton } from "@/components/pages/landing/shared/CTAButton";

export function Text() {
  return (
    <div className="flex h-fit flex-col items-center justify-center gap-6 text-center xl:w-[584px] xl:items-start xl:text-left">
      <HeroText h1>
        The open source
        <br />
        <strong>Block-Based</strong>
        <br />
        rich text editor
      </HeroText>
      <SectionSubtext>
        A beautiful text editor that just works. Easily add an editor to your
        app that users will love. Customize it with your own functionality like
        custom blocks or AI tooling.
      </SectionSubtext>
      <CTAButton href={"/docs"} hoverGlow={true}>
        Get Started
      </CTAButton>
    </div>
  );
}
