import {
  HeroText,
  SectionSubtext,
} from "@/components/pages/landing/shared/Headings";
import CTAButton from "@/components/pages/landing/shared/CTAButton";

export function Text() {
  return (
    <div className="relative flex h-fit flex-col items-center justify-center gap-6 text-center xl:w-[584px] xl:items-start xl:text-left">
      <div className="hero-glow text-glow absolute block h-full w-full sm:hidden" />
      <HeroText h1 className={"z-10"}>
        The open source
        <br />
        <strong>Block-Based</strong>
        <br />
        rich text editor
      </HeroText>
      <SectionSubtext className={"z-10"}>
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
