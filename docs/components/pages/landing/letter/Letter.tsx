import cn from "classnames";
import Link from "next/link";

import { CTAButton } from "../../home-shared/CTAButton";
import { FadeIn } from "../shared/FadeIn";
import { HeroText } from "../../home-shared/Headings";
import gradients from "../../home-shared/gradients.module.css";

export function Letter() {
  return (
    <section className="relative flex flex-col items-center gap-14 px-6 py-16 font-sans md:py-24 lg:py-32">
      <FadeIn noVertical className={"absolute top-0 z-10 h-full w-full"}>
        <div className={"section-glow h-full w-full"} />
      </FadeIn>
      <FadeIn className={"z-20"}>
        <HeroText>Let&apos;s build</HeroText>
      </FadeIn>
      <div className="z-20 flex max-w-xl flex-col leading-6 md:text-lg lg:text-lg">
        <FadeIn className="opacity-70">
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
        <FadeIn
          className="relative h-2 md:h-12 lg:h-12"
          noVertical
          viewTriggerOffset>
          <span
            className={cn(
              "absolute -bottom-8 h-[1px] w-full md:-bottom-4 lg:-bottom-4",
              gradients.letterLine,
            )}
          />
        </FadeIn>
        {/* <FadeIn
          className="flex items-end justify-center gap-3 md:self-start md:-ml-4 lg:self-start lg:-ml-4 min-w-[300px]"
          noVertical
          viewTriggerOffset>
          <div className="w-24 h-24 min-w-[96px] min-h-[96px] rounded-full border dark:border-white/10 border-black/10 flex items-center justify-center ">
            <Image
              alt="Image of Tobias Koopers"
              className="rounded-full"
              height={64}
              src="/images/people/tobiaskoppers.jpg"
              width={64}
            />
          </div>
          <div className="flex flex-col gap-3 pb-2">
            <Image
              alt="Tobias Koppers hand written signature"
              className="block -mb-3 -ml-3 dark:hidden"
              height={91 + 16}
              src="/images/docs/pack/tobias-signature-light.svg"
              // 16 px added and offset to account for the glow
              width={173 + 16}
            />
            <Image
              alt="Tobias Koppers hand written signature"
              className="hidden -mb-3 -ml-3 dark:block"
              height={91 + 16}
              src="/images/docs/pack/tobias-signature-dark.svg"
              // 16 px added and offset to account for the glow
              width={173 + 16}
            />
            <div className="flex gap-2 flex-wrap text-sm leading-none text-[#888888] max-w-[156px] md:max-w-xl lg:max-w-xl">
              <p className="font-bold">Tobias Koppers</p>
              <p>Creator of Webpack</p>
            </div>
          </div>
        </FadeIn> */}
      </div>
      <FadeIn
        className="relative z-20 mt-16 flex w-full justify-center"
        noVertical>
        <div className="w-full max-w-[180px]">
          <CTAButton>
            <Link className="block py-3 font-sans" href="/pack/docs">
              Start Building
            </Link>
          </CTAButton>
        </div>
        {/*<Gradient*/}
        {/*  className="bottom-[-200px] -z-10 opacity-20"*/}
        {/*  conic*/}
        {/*  height={300}*/}
        {/*  width={1200}*/}
        {/*/>*/}
      </FadeIn>
    </section>
  );
}
