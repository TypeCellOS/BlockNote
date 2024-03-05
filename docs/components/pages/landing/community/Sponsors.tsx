import {
  SponsorCard,
  SponsorCardProps,
} from "@/components/pages/landing/community/SponsorCard";
import { FadeIn } from "@/components/pages/landing/shared/FadeIn";
import { SectionSubHeader } from "@/components/pages/landing/shared/Headings";

import fermatDark from "../../../../public/img/sponsors/fermat-dark.png";
import fermatLight from "../../../../public/img/sponsors/fermat.png";
import nlnetDark from "../../../../public/img/sponsors/nlnet-dark.svg";
import nlnetLight from "../../../../public/img/sponsors/nlnet.svg";
import noteplanDark from "../../../../public/img/sponsors/noteplan-dark.png";
import noteplanLight from "../../../../public/img/sponsors/noteplan.png";
import poggioDark from "../../../../public/img/sponsors/poggio-dark.svg";
import poggioLight from "../../../../public/img/sponsors/poggio.svg";
import twentyDark from "../../../../public/img/sponsors/twenty-dark.png";
import twentyLight from "../../../../public/img/sponsors/twenty.png";
import typecellDark from "../../../../public/img/sponsors/typecell-dark.svg";
import typecellLight from "../../../../public/img/sponsors/typecell.svg";

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
    tagline: "YC S23",
  },
  {
    logo: {
      light: noteplanLight,
      dark: noteplanDark,
    },
    name: "Noteplan",
    tagline: "Apple Top Notes Apps",
  },
];

export function Sponsors() {
  return (
    <div className={"flex w-fit max-w-full flex-col items-center gap-4"}>
      <FadeIn>
        <SectionSubHeader>Sponsors &amp; users</SectionSubHeader>
      </FadeIn>
      <FadeIn className="grid grid-cols-2 gap-0.5 overflow-hidden rounded-2xl md:grid-cols-3">
        {sponsorsCardData.map((sponsor) => (
          <SponsorCard key={sponsor.name} {...sponsor} />
        ))}
      </FadeIn>
    </div>
  );
}
