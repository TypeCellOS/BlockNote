import { ContentSlide } from "../../_components/ContentSlide";

export const SlideSuggestions = () => {
  return (
    <ContentSlide title="Looking ahead: Suggestions & Versioning">
      <div className="grid grid-cols-2 items-center gap-12">
        <div className="flex w-full items-center justify-center overflow-hidden rounded-xl border border-stone-200 bg-stone-100 shadow-sm">
          <video
            className="w-full"
            src="/video/demo-suggestions.mp4"
            autoPlay
            loop
            muted
            playsInline
            data-preview-video="/video/demo-suggestions.mp4"
          />
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
