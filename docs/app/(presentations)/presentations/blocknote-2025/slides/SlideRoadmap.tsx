import { ContentSlide } from "../../_components/ContentSlide";
import { SlideCard } from "../../_components/SlideCard";
import { SlideHeading } from "../../_components/SlideHeading";
import { SlideText } from "../../_components/SlideText";

export const SlideRoadmap = () => {
  return (
    <ContentSlide title="Looking ahead: Roadmap">
      <div className="grid grid-cols-2 gap-12">
        <div className="space-y-6">
          <SlideCard>
            <SlideHeading>Foundations</SlideHeading>
            <SlideText>
              Improved mobile support, stability and accessibility.
            </SlideText>
          </SlideCard>
          <SlideCard>
            <SlideHeading>Extension API &amp; Gallery</SlideHeading>
            <SlideText>
              Unified API for bundling editor customizations.
            </SlideText>
          </SlideCard>
        </div>
        <div className="space-y-6">
          <SlideCard>
            <SlideHeading>Governance</SlideHeading>
            <SlideText>
              Increased roadmap transparency and community involvement.
            </SlideText>
          </SlideCard>
          <SlideCard>
            <SlideHeading>Document Imports</SlideHeading>
            <SlideText>Import .docx and .odt documents.</SlideText>
          </SlideCard>
        </div>
      </div>
    </ContentSlide>
  );
};
