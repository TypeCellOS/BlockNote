import { ContentSlide } from "../../_components/ContentSlide";
import { SlideCard } from "../../_components/SlideCard";

export const SlideKeyNumbers = () => {
  return (
    <ContentSlide title="2025: A Year of Growth">
      <div className="grid grid-cols-3 gap-8 py-8">
        <SlideCard className="flex flex-col gap-2">
          <span className="text-7xl font-bold text-purple-600">60</span>
          <span className="text-2xl font-medium text-stone-600">Releases</span>
        </SlideCard>
        <SlideCard className="flex flex-col gap-2">
          <span className="text-7xl font-bold text-purple-600">300</span>
          <span className="text-2xl font-medium text-stone-600">
            PRs merged
          </span>
        </SlideCard>
        <SlideCard className="flex flex-col gap-2">
          <span className="text-7xl font-bold text-purple-600">100K</span>
          <span className="text-2xl font-medium text-stone-600">
            Weekly Downloads (+300%)
          </span>
        </SlideCard>
        <SlideCard className="flex flex-col gap-2">
          <span className="text-7xl font-bold text-stone-800">50</span>
          <span className="text-2xl font-medium text-stone-600">Features</span>
        </SlideCard>
        <SlideCard className="flex flex-col gap-2">
          <span className="text-7xl font-bold text-stone-800">170</span>
          <span className="text-2xl font-medium text-stone-600">Fixes</span>
        </SlideCard>
        <SlideCard className="flex flex-col gap-2">
          <span className="text-7xl font-bold text-stone-800">7</span>
          <span className="text-2xl font-medium text-stone-600">
            Major Refactors
          </span>
        </SlideCard>
      </div>
    </ContentSlide>
  );
};
