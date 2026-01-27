import { ContentSlide } from "../../_components/ContentSlide";
import { SlideCard } from "../../_components/SlideCard";
import { SlideHeading } from "../../_components/SlideHeading";

export const SlideRoadmap = () => {
  return (
    <ContentSlide title="Looking ahead" wide>
      <div className="grid grid-cols-3 gap-8">
        {/* Features */}
        <SlideCard className="flex flex-col gap-4">
          <SlideHeading className="mb-2 text-purple-600">
            <span className="mr-2">✨</span>Features
          </SlideHeading>
          <ul className="space-y-3 text-xl text-stone-600">
            <li>
              Async Collaboration
              <br />
              <span className="text-base text-stone-500">
                (Suggestions & Versioning)
              </span>
            </li>
            <li>AI advancements</li>
            <li>
              Advanced "live" blocks
              <br />
              <span className="text-base text-stone-500">(Math, Mermaid)</span>
            </li>
            <li>Embeds</li>
          </ul>
        </SlideCard>

        {/* Foundations */}
        <SlideCard className="flex flex-col gap-4">
          <SlideHeading className="mb-2 text-purple-600">
            <span className="mr-2">🏗️</span>Foundations
          </SlideHeading>
          <ul className="space-y-3 text-xl text-stone-600">
            <li>
              Core
              <br />
              <span className="text-base text-stone-500">
                Improved mobile support, test coverage, a11y
              </span>
            </li>
            <li>Improved selection API</li>
            <li>Standard Schema / Zod</li>
          </ul>
        </SlideCard>

        {/* Ecosystem */}
        <SlideCard className="flex flex-col gap-4">
          <SlideHeading className="mb-2 text-purple-600">
            <span className="mr-2">🌍</span>Ecosystem
          </SlideHeading>
          <ul className="space-y-3 text-xl text-stone-600">
            <li>Governance</li>
            <li>
              Interoperability
              <br />
              <span className="text-base text-stone-500">
                Document imports (.docx, .odt)
              </span>
            </li>
            <li>Extension API & gallery</li>
            <li>Standardization</li>
          </ul>
        </SlideCard>
      </div>
    </ContentSlide>
  );
};
