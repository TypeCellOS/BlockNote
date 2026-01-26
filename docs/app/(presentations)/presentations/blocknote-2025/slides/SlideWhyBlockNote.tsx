import { ContentSlide } from "../../_components/ContentSlide";

export const SlideWhyBlockNote = () => {
  return (
    <ContentSlide title="Building editors is hard...">
      <div className="grid grid-cols-2 items-center gap-12">
        <div>
          <p className="mb-6 text-3xl italic text-stone-500">
            ...so we set out to create an editor that makes it easy:
          </p>
          <div className="space-y-6">
            <ul className="list-disc space-y-4 pl-6 text-2xl text-stone-600 marker:text-purple-500">
              <li>
                <strong className="text-purple-600">Batteries included</strong>,
                Notion-style UX
              </li>
              <li>
                Understandable, type-safe APIs
                <ul className="list-disc space-y-4 pl-6 text-2xl text-stone-600 marker:text-purple-500">
                  <li>(no "position juggling" 🤯)</li>
                </ul>
              </li>
              <li>Block-based design and API</li>
              <li>Internally built on Prosemirror and Yjs</li>
            </ul>
          </div>
        </div>

        <div className="w-full">
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl border border-stone-200 shadow-2xl shadow-purple-200/50">
            <div className="flex h-full flex-col bg-white">
              <div className="flex items-center gap-4 border-b border-stone-100 bg-white/50 px-4 py-3 backdrop-blur-md">
                <div className="flex gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
                  <div className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
                  <div className="h-2.5 w-2.5 rounded-full bg-green-400/80" />
                </div>
                <div className="flex flex-1 items-center justify-center rounded-md bg-stone-100/50 py-1 text-[10px] font-medium text-stone-400">
                  blocknotejs.org
                </div>
                <div className="w-10" />
              </div>
              <div className="relative flex-1 bg-white">
                <video
                  data-autoplay
                  src="/video/blocknote-explainer.mp4"
                  className="h-full w-full object-cover"
                  muted
                  playsInline
                  loop
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </ContentSlide>
  );
};
