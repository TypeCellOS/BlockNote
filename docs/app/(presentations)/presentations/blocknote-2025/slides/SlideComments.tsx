import { ContentSlide } from "../../_components/ContentSlide";

export const SlideComments = () => {
  return (
    <ContentSlide title="Comments & Threads" wide>
      <div className="grid grid-cols-2 items-start gap-12">
        <div className="flex flex-col gap-8">
          <ul className="list-inside list-disc space-y-4 text-2xl text-stone-600">
            <li>Inline comments & threads</li>
            <li>Reactions (emojis)</li>
            <li>Real-time updates</li>
            <li>Customizable UI components</li>
          </ul>
        </div>

        <div className="relative aspect-[4/3] w-full">
          {/* Image 1: Fade out when next fragment triggers */}
          <img
            src="/img/slides/comments-1.png"
            alt="Inline Comments"
            className="fragment fade-out absolute left-0 top-0 h-full w-full rounded-xl border border-stone-200 object-contain shadow-sm"
            data-fragment-index="0"
          />
          {/* Image 2: Fade in when same fragment triggers */}
          <img
            src="/img/slides/comments-2.png"
            alt="Sidebar Comments"
            className="fragment fade-in absolute left-0 top-0 h-full w-full rounded-xl border border-stone-200 object-contain shadow-sm"
            data-fragment-index="0"
          />
        </div>
      </div>
    </ContentSlide>
  );
};
