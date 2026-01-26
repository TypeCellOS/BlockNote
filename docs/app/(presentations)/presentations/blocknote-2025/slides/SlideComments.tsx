import { ContentSlide } from "../../_components/ContentSlide";

export const SlideComments = () => {
  return (
    <ContentSlide title="Comments & Threads">
      <div className="flex h-[400px] w-full items-center justify-center rounded-xl border border-stone-200 bg-stone-100 text-stone-400">
        {/* Placeholder for Screenshot */}
        <div className="flex flex-col items-center gap-2">
          <span className="text-6xl">💬</span>
          <span className="text-2xl">(Screenshot placeholder)</span>
        </div>
      </div>
    </ContentSlide>
  );
};
