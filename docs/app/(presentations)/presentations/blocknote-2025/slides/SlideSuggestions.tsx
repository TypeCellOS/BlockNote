import { ContentSlide } from "../../_components/ContentSlide";

export const SlideSuggestions = () => {
  return (
    <ContentSlide title="Looking ahead: Suggestions & Versioning">
      <div className="grid grid-cols-2 items-center gap-12">
        <div className="flex h-[350px] w-full items-center justify-center rounded-xl border border-stone-200 bg-stone-100 text-stone-400">
          {/* Placeholder for Video */}
          <div className="flex flex-col items-center gap-2">
            <span className="text-4xl">✨</span>
            <span>(Video placeholder)</span>
          </div>
        </div>

        <div className="rounded-xl border border-purple-100 bg-purple-50 p-6">
          <p className="mb-4 text-3xl font-medium text-purple-900">
            Want to dive deeper?
          </p>
          <p className="text-2xl text-stone-600">
            Join us in the{" "}
            <strong className="text-purple-700">Local First devroom</strong> on
            Sunday for a dedicated session on this topic.
          </p>
        </div>
      </div>
    </ContentSlide>
  );
};
