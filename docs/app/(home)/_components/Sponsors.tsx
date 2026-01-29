import { InfiniteSlider } from "@/components/InfiniteSlider";
import agree from "@/public/img/sponsors/agree.png";
import atuin from "@/public/img/sponsors/atuin.png";
import capitolDark from "@/public/img/sponsors/capitolDark.svg";
import capitolLight from "@/public/img/sponsors/capitolLight.svg";
import cella from "@/public/img/sponsors/cella.png";
import deepOrigin from "@/public/img/sponsors/deepOrigin.svg";
import dinumDark from "@/public/img/sponsors/dinumDark.svg";
import dinumLight from "@/public/img/sponsors/dinumLight.svg";
import illumi from "@/public/img/sponsors/illumi.png";
import juma from "@/public/img/sponsors/juma.svg";
import nlnetDark from "@/public/img/sponsors/nlnetDark.svg";
import nlnetLight from "@/public/img/sponsors/nlnetLight.svg";
import openproject from "@/public/img/sponsors/openproject.svg";
import twentyDark from "@/public/img/sponsors/twentyDark.png";
import twentyLight from "@/public/img/sponsors/twentyLight.png";
import zendis from "@/public/img/sponsors/zendis.svg";
import Image from "next/image";

const sponsors = [
  // {
  //   name: "Semrush",
  //   logo: ( ... )
  // },
  {
    name: "NLnet",
    logo: (
      <>
        <Image
          src={nlnetLight}
          alt="NLnet"
          className="h-9 w-auto dark:hidden"
        />
        <Image
          src={nlnetDark}
          alt="NLnet"
          className="hidden h-9 w-auto dark:block"
        />
      </>
    ),
  },
  {
    name: "DINUM",
    logo: (
      <>
        <Image
          src={dinumLight}
          alt="DINUM"
          className="h-8 w-auto dark:hidden"
        />
        <Image
          src={dinumDark}
          alt="DINUM"
          className="hidden h-8 w-auto dark:block"
        />
      </>
    ),
  },
  {
    name: "ZenDiS",
    logo: <Image src={zendis} alt="ZenDiS" className="h-8 w-auto" />,
  },
  {
    name: "OpenProject",
    logo: <Image src={openproject} alt="OpenProject" className="h-8 w-auto" />,
  },
  // {
  //   name: "Poggio",
  //   logo: ( ... )
  // },
  {
    name: "Capitol",
    logo: (
      <>
        <Image
          src={capitolLight}
          alt="Capitol"
          className="h-7 w-auto dark:hidden"
        />
        <Image
          src={capitolDark}
          alt="Capitol"
          className="hidden h-7 w-auto dark:block"
        />
      </>
    ),
  },
  {
    name: "Twenty",
    logo: (
      <>
        <Image
          src={twentyLight}
          alt="Twenty"
          className="h-7 w-auto dark:hidden"
        />
        <Image
          src={twentyDark}
          alt="Twenty"
          className="hidden h-7 w-auto dark:block"
        />
      </>
    ),
  },
  {
    name: "Deep Origin",
    logo: <Image src={deepOrigin} alt="Deep Origin" className="h-7 w-auto" />,
  },
  // {
  //   name: "Krisp",
  //   ...
  // },
  //  {
  //   name: "Lemni",
  //   ...
  // },
  // {
  //   name: "Claimer",
  //   ...
  // },
  {
    name: "Juma",
    logo: <Image src={juma} alt="Juma" className="h-7 w-auto" />,
  },
  {
    name: "Atuin",
    logo: <Image src={atuin} alt="Atuin" className="h-9 w-auto" />,
  },
  {
    name: "Cella",
    logo: <Image src={cella} alt="Cella" className="h-7 w-auto" />,
  },
  {
    name: "Illumi",
    logo: <Image src={illumi} alt="Illumi" className="h-7 w-auto" />,
  },
  {
    name: "Agree",
    logo: <Image src={agree} alt="Agree" className="h-9 w-auto" />,
  },
];

export const Sponsors = (props: { title?: string }) => {
  return (
    <div className="border-t border-stone-200 pt-12 dark:border-stone-800">
      {props.title && (
        <p className="mb-8 text-center text-sm font-medium text-stone-500">
          {props.title}
        </p>
      )}
      <InfiniteSlider gap={48} speed={30} speedOnHover={15}>
        {sponsors.map((sponsor, index) => (
          <div
            key={index}
            className="flex h-16 items-center justify-center px-4 opacity-60 grayscale transition-all hover:opacity-100 hover:grayscale-0"
          >
            {sponsor.logo ? (
              sponsor.logo
            ) : (
              <span className="text-sm font-medium text-stone-400">
                {sponsor.name}
              </span>
            )}
          </div>
        ))}
      </InfiniteSlider>
    </div>
  );
};
