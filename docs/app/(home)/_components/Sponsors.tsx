"use client";
import { InfiniteSlider } from "@/components/InfiniteSlider";

const sponsors = [
  // {
  //   name: "Semrush",
  //   logo: (
  //     <>
  //       <img
  //         src="/img/sponsors/semrush.light.png"
  //         alt="Semrush"
  //         className="h-8 dark:hidden"
  //       />
  //       <img
  //         src="/img/sponsors/semrush.dark.png"
  //         alt="Semrush"
  //         className="hidden h-8 dark:block"
  //       />
  //     </>
  //   ),
  // },
  {
    name: "NLnet",
    logo: (
      <>
        <img
          src="/img/sponsors/nlnetLight.svg"
          alt="NLnet"
          className="h-9 dark:hidden"
        />
        <img
          src="/img/sponsors/nlnetDark.svg"
          alt="NLnet"
          className="hidden h-9 dark:block"
        />
      </>
    ),
  },
  {
    name: "DINUM",
    logo: (
      <>
        <img
          src="/img/sponsors/dinumLight.svg"
          alt="DINUM"
          className="h-8 dark:hidden"
        />
        <img
          src="/img/sponsors/dinumDark.svg"
          alt="DINUM"
          className="hidden h-8 dark:block"
        />
      </>
    ),
  },
  {
    name: "ZenDiS",
    logo: <img src="/img/sponsors/zendis.svg" alt="ZenDiS" className="h-8" />,
  },
  {
    name: "OpenProject",
    logo: (
      <img
        src="/img/sponsors/openproject.svg"
        alt="OpenProject"
        className="h-8"
      />
    ),
  },
  {
    name: "Poggio",
    logo: (
      <>
        <img
          src="/img/sponsors/poggioLight.svg"
          alt="Poggio"
          className="h-7 dark:hidden"
        />
        <img
          src="/img/sponsors/poggioDark.svg"
          alt="Poggio"
          className="hidden h-7 dark:block"
        />
      </>
    ),
  },
  {
    name: "Capitol",
    logo: (
      <>
        <img
          src="/img/sponsors/capitolLight.svg"
          alt="Capitol"
          className="h-7 dark:hidden"
        />
        <img
          src="/img/sponsors/capitolDark.svg"
          alt="Capitol"
          className="hidden h-7 dark:block"
        />
      </>
    ),
  },
  {
    name: "Twenty",
    logo: (
      <>
        <img
          src="/img/sponsors/twentyLight.png"
          alt="Twenty"
          className="h-7 dark:hidden"
        />
        <img
          src="/img/sponsors/twentyDark.png"
          alt="Twenty"
          className="hidden h-7 dark:block"
        />
      </>
    ),
  },
  {
    name: "Deep Origin",
    logo: (
      <img
        src="/img/sponsors/deepOrigin.svg"
        alt="Deep Origin"
        className="h-7"
      />
    ),
  },
  // {
  //   name: "Krisp",
  //   logo: <img src="/img/sponsors/krisp.svg" alt="Krisp" className="h-7" />,
  // },
  //  {
  //   name: "Lemni",
  //   logo: <img src="/img/sponsors/krisp.svg" alt="Krisp" className="h-7" />,
  // },
  // {
  //   name: "Claimer",
  //   logo: <img src="/img/sponsors/claimer.svg" alt="Claimer" className="h-7" />,
  // },
  {
    name: "Atlas",
    logo: <img src="/img/sponsors/atlas.svg" alt="Atlas" className="h-7" />,
  },
  {
    name: "Juma",
    logo: <img src="/img/sponsors/juma.svg" alt="Juma" className="h-7" />,
  },
  {
    name: "Atuin",
    logo: <img src="/img/sponsors/atuin.png" alt="Atuin" className="h-9" />,
  },
  {
    name: "Cella",
    logo: <img src="/img/sponsors/cella.png" alt="Cella" className="h-7" />,
  },
  {
    name: "Illumi",
    logo: <img src="/img/sponsors/illumi.png" alt="Illumi" className="h-7" />,
  },
  {
    name: "Agree",
    logo: <img src="/img/sponsors/agree.png" alt="Agree" className="h-9" />,
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
