import { SectionHeader } from "../../home-shared/Headings";
import { FadeIn } from "../shared/FadeIn";
import {
  SponsorCard,
  SponsorCardProps,
} from "@/components/pages/landing/sponsors/SponsorCard";

import fermatLight from "../../../../public/img/sponsors/fermat.png";
import fermatDark from "../../../../public/img/sponsors/fermat-dark.png";
import nlnetLight from "../../../../public/img/sponsors/nlnet.svg";
import nlnetDark from "../../../../public/img/sponsors/nlnet-dark.svg";
import typecellLight from "../../../../public/img/sponsors/typecell.svg";
import typecellDark from "../../../../public/img/sponsors/typecell-dark.svg";
import poggioLight from "../../../../public/img/sponsors/poggio.svg";
import poggioDark from "../../../../public/img/sponsors/poggio-dark.svg";
import twentyLight from "../../../../public/img/sponsors/twenty.png";
import twentyDark from "../../../../public/img/sponsors/twenty-dark.png";
import noteplanLight from "../../../../public/img/sponsors/noteplan.png";
import noteplanDark from "../../../../public/img/sponsors/noteplan-dark.png";

export const sponsorsCardData: SponsorCardProps[] = [
  {
    logo: {
      light: fermatLight,
      dark: fermatDark,
    },
    name: "Fermat",
  },
  {
    logo: {
      light: nlnetLight,
      dark: nlnetDark,
    },
    name: "NLNet",
  },
  {
    logo: {
      light: typecellLight,
      dark: typecellDark,
    },
    name: "TypeCell",
  },
  {
    logo: {
      light: poggioLight,
      dark: poggioDark,
    },
    name: "Poggio",
  },
  {
    logo: {
      light: twentyLight,
      dark: twentyDark,
    },
    name: "Twenty",
  },
  {
    logo: {
      light: noteplanLight,
      dark: noteplanDark,
    },
    name: "Noteplan",
  },
];

export function Sponsors() {
  return (
    <section className="relative flex flex-col items-center gap-9 overflow-hidden py-16 pb-16 font-sans md:pb-24 lg:gap-14 lg:pb-32">
      <FadeIn noVertical className={"absolute top-0 z-10 h-full w-full"}>
        <div className={"section-glow h-full w-full"} />
      </FadeIn>
      <div
        className={
          "z-20 flex w-fit max-w-full flex-col items-center gap-12 px-4"
        }>
        <FadeIn className="">
          <SectionHeader>Sponsors &amp; users</SectionHeader>
        </FadeIn>
        <FadeIn className="grid grid-cols-2 gap-0.5 overflow-hidden rounded-2xl md:grid-cols-3">
          {sponsorsCardData.map((sponsor) => (
            <SponsorCard key={sponsor.name} {...sponsor} />
          ))}
        </FadeIn>
      </div>
    </section>
  );
}
