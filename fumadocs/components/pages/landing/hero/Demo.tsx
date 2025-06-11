import dynamic from "next/dynamic";
import Image from "next/image";
import tryHereImageDark from "@/public/img/assets/try.dark.svg";
import tryHereImageLight from "@/public/img/assets/try.svg";

function TryHereImageBase(props: { dark: boolean }) {
  return (
    <Image
      src={props.dark ? tryHereImageDark : tryHereImageLight}
      className={`relative bottom-24 left-10 z-30 float-right size-56 ${props.dark ? "hidden dark:block" : "block dark:hidden"}`}
      alt="Try it out"
    />
  );
}

function TryHereImage() {
  return (
    <>
      <TryHereImageBase dark={false} />
      <TryHereImageBase dark={true} />
    </>
  );
}

const DemoEditor = dynamic(
  () => import("@/components/pages/landing/hero/DemoEditor"),
  {
    ssr: false,
  },
);

export function Demo(props: { theme?: "light" | "dark" }) {
  return (
    <div className="hero-demo relative h-[36rem] w-full shrink-0 grow-0 rounded-lg sm:block xl:w-[584px]">
      <div className="hero-glow demo-glow absolute z-10 h-full w-full" />
      <div className="relative z-20 h-full w-full rounded-lg bg-white dark:bg-[#202020]">
        <DemoEditor theme={props.theme} />
      </div>
      <TryHereImage />
    </div>
  );
}
