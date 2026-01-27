import { ContentSlide } from "../../_components/ContentSlide";
import { SlideCard } from "../../_components/SlideCard";
import { SlideHeading } from "../../_components/SlideHeading";

export const SlideFunding = () => {
  return (
    <ContentSlide title="100% Open Source.">
      <div className="space-y-12">
        {/* Top Row: Initial Funding & Collaboration */}
        <div>
          <SlideHeading className="mb-6">
            Enabling Digital Commons in partnership with:
          </SlideHeading>
          <div className="flex items-center justify-around gap-12 rounded-xl border border-stone-100 bg-white p-8 shadow-sm">
            <img
              src="/img/sponsors/nlnetLight.svg"
              alt="NLnet"
              className="h-12 opacity-90"
            />
            <img
              src="/img/sponsors/zendis.svg"
              alt="ZenDiS"
              className="h-10 opacity-90"
            />
            <img
              src="/img/sponsors/dinumLight.svg"
              alt="DINUM"
              className="h-14 opacity-90"
            />
            <img
              src="/img/sponsors/lasuite-docs.svg"
              alt="Docs"
              className="h-10 opacity-90"
            />
          </div>
        </div>

        {/* Bottom Row: Sponsors */}
        <div>
          <SlideHeading className="mb-6">Supported by industry:</SlideHeading>
          <SlideCard className="border-stone-100 p-8">
            <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-8 opacity-70 grayscale transition-all hover:opacity-100 hover:grayscale-0">
              <img
                src="/img/sponsors/openproject.svg"
                alt="OpenProject"
                className="h-8"
              />
              <img
                src="/img/sponsors/poggioLight.svg"
                alt="Poggio"
                className="h-7"
              />
              <img
                src="/img/sponsors/capitolLight.svg"
                alt="Capitol"
                className="h-7"
              />
              <img
                src="/img/sponsors/twentyLight.png"
                alt="Twenty"
                className="h-7"
              />
              <img
                src="/img/sponsors/deepOrigin.svg"
                alt="Deep Origin"
                className="h-7"
              />
              <img src="/img/sponsors/krisp.svg" alt="Krisp" className="h-7" />

              <img src="/img/sponsors/atlas.svg" alt="Atlas" className="h-7" />
              <img src="/img/sponsors/juma.svg" alt="Juma" className="h-7" />
              <img src="/img/sponsors/atuin.png" alt="Atuin" className="h-8" />
              <img src="/img/sponsors/cella.png" alt="Cella" className="h-7" />
              <img
                src="/img/sponsors/illumi.png"
                alt="Illumi"
                className="h-7"
              />
              <img src="/img/sponsors/agree.png" alt="Agree" className="h-8" />
            </div>
            <p className="mt-6 text-center text-xl font-medium text-stone-400">
              (thank you!)
            </p>
          </SlideCard>
        </div>
      </div>
    </ContentSlide>
  );
};
