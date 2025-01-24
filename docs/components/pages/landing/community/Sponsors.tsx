import {
  SponsorCard,
  SponsorCardProps,
} from "@/components/pages/landing/community/SponsorCard";
import { FadeIn } from "@/components/pages/landing/shared/FadeIn";
import { SectionSubHeader } from "@/components/pages/landing/shared/Headings";

import atuin from "../../../../public/img/sponsors/atuin.png";
import capitolDark from "../../../../public/img/sponsors/capitol-dark.svg";
import capitolLight from "../../../../public/img/sponsors/capitol-light.svg";
import deepOrigin from "../../../../public/img/sponsors/deeporigin.svg";
import dinumDark from "../../../../public/img/sponsors/dinum-dark.svg";
import dinumLight from "../../../../public/img/sponsors/dinum-light.svg";
import fermatDark from "../../../../public/img/sponsors/fermat-dark.svg";
import fermatLight from "../../../../public/img/sponsors/fermat.svg";
import nlnetDark from "../../../../public/img/sponsors/nlnet-dark.svg";
import nlnetLight from "../../../../public/img/sponsors/nlnet.svg";
import notePlanDark from "../../../../public/img/sponsors/notePlan-dark.png";
import notePlanLight from "../../../../public/img/sponsors/notePlan.png";
import poggioDark from "../../../../public/img/sponsors/poggio-dark.svg";
import poggioLight from "../../../../public/img/sponsors/poggio.svg";
import twentyDark from "../../../../public/img/sponsors/twenty-dark.png";
import twentyLight from "../../../../public/img/sponsors/twenty.png";
import typecellDark from "../../../../public/img/sponsors/typecell-dark.svg";
import typecellLight from "../../../../public/img/sponsors/typecell.svg";
import zendis from "../../../../public/img/sponsors/zendis.svg";

export const sponsorsCardData: SponsorCardProps[] = [
  {
    logo: {
      light: atuin,
      dark: atuin,
    },
    name: "Atuin",
    link: "https://atuin.sh/",
  },
  {
    logo: {
      light: capitolLight,
      dark: capitolDark,
    },
    name: "Capitol",
    link: "https://www.capitol.ai/",
  },
  {
    logo: {
      light: deepOrigin,
      dark: deepOrigin,
    },
    name: "Deep Origin",
    link: "https://www.deeporigin.com/",
  },
  {
    logo: {
      light: dinumLight,
      dark: dinumDark,
    },
    name: "DINUM",
    link: "https://www.numerique.gouv.fr/dinum/",
  },
  {
    logo: {
      light: fermatLight,
      dark: fermatDark,
    },
    name: "Fermat",
    link: "https://fermat.app/",
  },
  {
    logo: {
      light: nlnetLight,
      dark: nlnetDark,
    },
    name: "NLNet",
    link: "https://nlnet.nl/",
  },
  {
    logo: {
      light: notePlanLight,
      dark: notePlanDark,
    },
    name: "NotePlan",
    link: "https://noteplan.co/",
    tagline: "Apple Top Notes Apps",
  },
  {
    logo: {
      light: poggioLight,
      dark: poggioDark,
    },
    name: "Poggio",
    link: "https://poggio.io/",
  },
  {
    logo: {
      light: twentyLight,
      dark: twentyDark,
    },
    name: "Twenty",
    link: "https://twenty.com/",
    tagline: "YC S23",
  },
  {
    logo: {
      light: typecellLight,
      dark: typecellDark,
    },
    name: "TypeCell",
    link: "https://www.typecell.org/",
  },
  {
    logo: {
      light: zendis,
      dark: zendis,
    },
    name: "ZenDiS",
    link: "https://zendis.de/",
  },
];

export function Sponsors() {
  return (
    <div className={"flex w-fit max-w-full flex-col items-center gap-4"}>
      <FadeIn>
        <SectionSubHeader>Sponsors &amp; users</SectionSubHeader>
      </FadeIn>
      <FadeIn className="grid grid-cols-2 gap-2 overflow-hidden md:grid-cols-3">
        {sponsorsCardData.map((sponsor) => (
          <SponsorCard key={sponsor.name} {...sponsor} />
        ))}
      </FadeIn>
    </div>
  );
}
