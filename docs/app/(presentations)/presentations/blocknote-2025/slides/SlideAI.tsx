import { ContentSlide } from "../../_components/ContentSlide";

export const SlideAI = () => {
  return (
    <ContentSlide title="AI Integration" wide>
      <div className="grid grid-cols-2 items-center gap-12">
        <div className="flex flex-col gap-6">
          <div className="flex items-start gap-6 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-stone-50 text-3xl">
              ✨
            </div>
            <div>
              <h3 className="mb-1 text-2xl font-bold text-stone-900">
                AI in the Editor
              </h3>
              <p className="text-xl text-stone-600">
                Context-aware completions and edits directly in the document.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-6 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-stone-50 text-3xl">
              🔌
            </div>
            <div>
              <h3 className="mb-1 text-2xl font-bold text-stone-900">
                Bring Any Model
              </h3>
              <p className="text-xl text-stone-600">
                Connect your own LLM inference endpoints.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-6 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-stone-50 text-3xl">
              🤝
            </div>
            <div>
              <h3 className="mb-1 text-2xl font-bold text-stone-900">
                Human in the Loop
              </h3>
              <p className="text-xl text-stone-600">
                Users accept, reject, or refine AI suggestions.
              </p>
            </div>
          </div>
        </div>

        <div className="flex w-full items-center justify-center overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
          <video
            className="w-full"
            src="/video/blocknote-explainer.mp4"
            muted
            playsInline
          />
        </div>
      </div>
    </ContentSlide>
  );
};
