// import { PackLogo } from "../../logos/PackLogo";

import { FadeIn } from "../home-shared/FadeIn";
import { HeroText, SectionSubtext } from "../home-shared/Headings";
import dynamic from "next/dynamic";

const Demo = dynamic(() => import("./demo/Demo"), { ssr: false });

export function PackHero() {
  return (
    <div className="flex h-fit w-full items-center justify-center py-36">
      <div className="grid grid-cols-1 items-center gap-y-16 px-16 md:max-w-screen-md xl:max-w-screen-xl xl:grid-cols-2 xl:gap-x-16">
        <FadeIn className="flex h-fit w-full flex-col items-center justify-center gap-5 text-center xl:items-start xl:text-left">
          <HeroText h1>
            The open source
            <br />
            <strong>Block-Based</strong>
            <br />
            rich text editor
          </HeroText>
          <SectionSubtext hero>
            A beautiful text editor that just works. Easily add an editor to
            your app that users will love. Customize it with your own
            functionality like custom blocks or AI tooling.
          </SectionSubtext>
          <div className="flex flex-wrap gap-x-6 gap-y-4">
            <a
              className="rounded-full bg-slate-800 px-4 py-2 text-lg font-medium text-white hover:bg-slate-700 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/50 active:text-slate-400"
              href="/docs">
              Get Started
            </a>
            {/* <a
                className="rounded-full bg-slate-800 py-2 px-4 text-sm font-medium text-white hover:bg-slate-700 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/50 active:text-slate-400"
                href="/">
                Get Started
              </a> */}
            {/* <AppStoreLink />
          <Button
            href="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
            variant="outline"
          >
            <PlayIcon className="h-6 w-6 flex-none" />
            <span className="ml-2.5">Watch the video</span>
          </Button> */}
          </div>
        </FadeIn>
        <div className="h-144 relative overflow-scroll overscroll-contain rounded-lg border">
          {/* TODO: Wait for editor & collab content to load before rendering. Show placeholder or delay loading?*/}
          <Demo />
          {/* <BackgroundIllustration className="absolute left-1/2 top-4 h-[1026px] w-[1026px] -translate-x-1/3 stroke-gray-300/70 [mask-image:linear-gradient(to_bottom,white_20%,transparent_75%)] sm:top-16 sm:-translate-x-1/2 lg:-top-16 lg:ml-12 xl:-top-14 xl:ml-0" />
        <div className="-mx-4 h-[448px] px-9 [mask-image:linear-gradient(to_bottom,white_60%,transparent)] sm:mx-0 lg:absolute lg:-inset-x-10 lg:-bottom-20 lg:-top-10 lg:h-auto lg:px-0 lg:pt-10 xl:-bottom-32">
          <PhoneFrame className="mx-auto max-w-[366px]" priority>
            <AppDemo />
          </PhoneFrame>
        </div> */}
        </div>
        {/* <div className="relative -mt-4 lg:col-span-7 lg:mt-0 xl:col-span-6">
            <p className="text-center text-sm font-semibold text-gray-900 lg:text-left">
              As featured in
            </p>
          </div> */}
      </div>
    </div>
  );
}

//     /*
// return (
//   <FadeIn
//     className="font-sans w-auto min-h-[calc(100svh-var(--nextra-navbar-height))] pb-16 pt-[48px] md:pb-24 lg:pb-32 md:pt-16 lg:pt-20 flex justify-between gap-8 items-center flex-col relative z-0"
//     noVertical>
//     <FadeIn className="z-50 flex items-center justify-center w-full">
//       <div className="w-[120px] z-50 mt-[-8.075px] mb-[-8.075px]"></div>
//     </FadeIn>
//     {/* <Gradient
//       className="top-[-500px] dark:opacity-20 opacity-[0.15]"
//       conic
//       height={1000}
//       width={1000}
//     /> */}
//     <div
//       className={classNames(
//         "absolute top-0 z-10 w-full h-48 dark:from-black from-white to-transparent bg-gradient-to-b",
//         styles.contentContainer
//       )}
//     />
//     <FadeIn
//       className={classNames(
//         "z-50 flex flex-col gap-5 px-6 text-left lg:gap-6 ",
//         styles.contentContainer
//       )}
//       delay={0.15}>
//       {/* <PackLogo
//         alt="Turbopack"
//         className="w-[160px] md:w-[200px] fill-black dark:fill-white"
//         width="200"
//       /> */}
//       <div className="flex flex-col">
//         <HeroText h1>
//           The open source <strong>Block-Based</strong>
//           <br />
//           rich text editor
//         </HeroText>
//         <SectionSubtext hero>
//           A beautiful text editor that just works. Easily add an editor to
//           your app that users will love. Customize it with your own
//           functionality like custom blocks or AI tooling.
//         </SectionSubtext>
//       </div>
//     </FadeIn>
//     <FadeIn
//       className="z-50 flex flex-col items-center w-full max-w-md gap-5 px-6"
//       delay={0.3}>
//       <div className="flex flex-col w-full gap-3 md:!flex-row">
//         <CTAButton>
//           <Link className="block py-3" href="/docs">
//             Get Started
//           </Link>
//         </CTAButton>
//       </div>
//     </FadeIn>
//     <FadeIn className="relative w-full" delay={0.5}>
//       <div className="absolute bottom-0 w-full dark:from-black from-white to-transparent h-72 bg-gradient-to-t" />
//     </FadeIn>
//   </FadeIn>
// );*/
// }
