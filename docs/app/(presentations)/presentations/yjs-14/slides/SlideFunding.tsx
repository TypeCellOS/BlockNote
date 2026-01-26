import { ContentSlide } from "../../_components/ContentSlide";
import { SlideHeading } from "../../_components/SlideHeading";

export const SlideFunding = () => {
  return (
    <ContentSlide title="100% Open Source.">
      <div className="space-y-12">
        {/* Top Row: Initial Funding & Collaboration */}
        <div>
          <SlideHeading className="mb-10">
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
      </div>
    </ContentSlide>
  );
};
