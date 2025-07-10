"use client";

import dynamic from "next/dynamic";
import ThemedImage from "@/components/ThemedImage";
import tryHereImageDark from "@/public/img/assets/try.dark.svg";
import tryHereImageLight from "@/public/img/assets/try.svg";

function TryHereImage() {
  return (
    <ThemedImage
      src={{ light: tryHereImageLight, dark: tryHereImageDark }}
      className="relative bottom-24 left-10 z-30 float-right size-56"
      alt="Try it out"
    />
  );
}

const DemoEditor = dynamic(() => import("@/app/(home)/hero/DemoEditor"), {
  ssr: false,
});

export function Demo() {
  return (
    <div className="hero-demo relative h-[36rem] w-full shrink-0 grow-0 rounded-lg sm:block xl:w-[584px]">
      <div className="hero-glow demo-glow absolute z-10 h-full w-full" />
      <div className="relative z-20 h-full w-full rounded-lg bg-white dark:bg-[#202020]">
        <DemoEditor />
      </div>
      <TryHereImage />
    </div>
  );
}
