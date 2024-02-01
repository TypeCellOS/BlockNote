import Link from "next/link";
import { CTAButton } from "../home-shared/CTAButton";
import { FadeIn } from "../home-shared/FadeIn";
import { HeroText, SectionSubtext } from "../home-shared/Headings";
// import { PackLogo } from "../../logos/PackLogo";
import classNames from "classnames";
import styles from "./PackHero.module.css";

export function PackHero() {
  return (
    <FadeIn
      className="font-sans w-auto min-h-[calc(100svh-var(--nextra-navbar-height))] pb-16 pt-[48px] md:pb-24 lg:pb-32 md:pt-16 lg:pt-20 flex justify-between gap-8 items-center flex-col relative z-0"
      noVertical>
      <FadeIn className="z-50 flex items-center justify-center w-full">
        <div className="w-[120px] z-50 mt-[-8.075px] mb-[-8.075px]"></div>
      </FadeIn>
      {/* <Gradient
        className="top-[-500px] dark:opacity-20 opacity-[0.15]"
        conic
        height={1000}
        width={1000}
      /> */}
      <div
        className={classNames(
          "absolute top-0 z-10 w-full h-48 dark:from-black from-white to-transparent bg-gradient-to-b",
          styles.contentContainer
        )}
      />
      <FadeIn
        className={classNames(
          "z-50 flex flex-col gap-5 px-6 text-left lg:gap-6 ",
          styles.contentContainer
        )}
        delay={0.15}>
        {/* <PackLogo
          alt="Turbopack"
          className="w-[160px] md:w-[200px] fill-black dark:fill-white"
          width="200"
        /> */}
        <div className="flex flex-col">
          <HeroText h1>
            The open source <strong>Block-Based</strong>
            <br />
            rich text editor
          </HeroText>
          <SectionSubtext hero>
            A beautiful text editor that just works. Easily add an editor to
            your app that users will love. Customize it with your own
            functionality like custom blocks or AI tooling.
          </SectionSubtext>
        </div>
        <div className="header-media">
          <div className="editor-wrapper">helloa</div>
          {/* <div class="try-here-image" /> */}
        </div>
      </FadeIn>
      <FadeIn
        className="z-50 flex flex-col items-center w-full max-w-md gap-5 px-6"
        delay={0.3}>
        <div className="flex flex-col w-full gap-3 md:!flex-row">
          <CTAButton>
            <Link className="block py-3" href="/pack/docs">
              Get Started
            </Link>
          </CTAButton>
          <CTAButton outline>
            <a
              className="block py-3"
              href="https://github.com/vercel/turbo"
              rel="noreferrer"
              target="_blank">
              GitHub
            </a>
          </CTAButton>
        </div>
        <p className="text-sm text-[#666666]">License: MPL-2.0</p>
      </FadeIn>
      <FadeIn className="relative w-full" delay={0.5}>
        <div className="absolute bottom-0 w-full dark:from-black from-white to-transparent h-72 bg-gradient-to-t" />
      </FadeIn>
    </FadeIn>
  );
}
