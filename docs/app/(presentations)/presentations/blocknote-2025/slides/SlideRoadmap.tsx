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
            <SlideText>Improving core stability and performance.</SlideText>
          </SlideCard>
          <SlideCard>
            <SlideHeading>Mobile Support</SlideHeading>
            <SlideText>First-class mobile editing experience.</SlideText>
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
            <SlideHeading>Stability</SlideHeading>
            <SlideText>
              Focus on LTS releases and minimizing breaking changes.
            </SlideText>
          </SlideCard>
        </div>
      </div>
    </ContentSlide>
  );
};
