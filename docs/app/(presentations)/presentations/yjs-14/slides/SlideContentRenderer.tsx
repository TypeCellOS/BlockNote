import { ArrowDown, User, GitCompare } from "lucide-react";
import { ContentSlide } from "../../_components/ContentSlide";

export const SlideContentRenderer = () => {
  return (
    <ContentSlide title="Display changes & suggestions" wide>
      <div className="flex h-full flex-col items-center justify-center gap-6">
        {/* Fixed width container to align all rows */}
        <div className="flex w-[800px] flex-col items-center gap-6">
          {/* Two source documents */}
          <div className="flex w-full justify-center gap-12">
            {/* Document A */}
            <div className="flex w-[220px] flex-col items-center gap-3">
              <div className="text-xs font-bold uppercase tracking-widest text-stone-400">
                Document A
              </div>
              <div className="flex h-[60px] items-center rounded-lg border-2 border-blue-200 bg-blue-50 px-6 shadow-sm">
                <div className="whitespace-nowrap font-mono text-xl">
                  <span className="text-stone-800">Hello world</span>
                </div>
              </div>
            </div>

            {/* Document B */}
            <div className="flex w-[220px] flex-col items-center gap-3">
              <div className="text-xs font-bold uppercase tracking-widest text-stone-400">
                Document B
              </div>
              <div className="flex h-[60px] items-center rounded-lg border-2 border-purple-200 bg-purple-50 px-6 shadow-sm">
                <div className="whitespace-nowrap font-mono text-xl">
                  <span className="text-stone-800">Hello everyone!</span>
                </div>
              </div>
            </div>
          </div>

          <ArrowDown size={28} strokeWidth={1.5} className="text-stone-300" />

          {/* Content Renderer in the middle */}
          <div className="rounded-xl border-2 border-dashed border-amber-400 bg-amber-50 px-8 py-4">
            <div className="text-center text-xl font-semibold text-amber-700">
              Content Renderer
            </div>
            <div className="mt-1 text-center text-sm text-amber-600">
              enhances content with external context
            </div>
          </div>

          <ArrowDown size={28} strokeWidth={1.5} className="text-stone-300" />

          {/* Two use cases side by side */}
          <div className="flex w-full justify-center gap-16">
            {/* Use Case 1: Diff View */}
            <div className="flex w-[300px] flex-col items-center gap-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-stone-400">
                <GitCompare size={14} />
                Diff View
              </div>
              <div className="flex h-[90px] items-center rounded-lg border-2 border-green-200 bg-white px-6 shadow-md">
                <div className="whitespace-nowrap font-mono text-xl">
                  <span className="text-stone-800">Hello </span>
                  <span className="bg-red-100 text-red-600 line-through">
                    world
                  </span>
                  <span className="bg-green-100 text-green-600">everyone!</span>
                </div>
              </div>
              <p className="h-[40px] text-center text-sm text-stone-500">
                Show differences between
                <br />
                two document states
              </p>
            </div>

            {/* Vertical divider */}
            <div className="h-[160px] w-px bg-stone-200" />

            {/* Use Case 2: Attribution View */}
            <div className="flex w-[300px] flex-col items-center gap-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-stone-400">
                <User size={14} />
                Attribution View
              </div>
              <div className="flex h-[90px] flex-col items-center justify-center rounded-lg border-2 border-indigo-200 bg-white px-6 shadow-md">
                <div className="whitespace-nowrap font-mono text-xl">
                  <span className="border-b-2 border-blue-400 text-stone-800">
                    Hello{" "}
                  </span>
                  <span className="border-b-2 border-pink-400 text-stone-800">
                    everyone!
                  </span>
                </div>
                <div className="mt-2 flex justify-center gap-4 text-xs">
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-blue-400" />
                    <span className="text-stone-500">Jane</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-pink-400" />
                    <span className="text-stone-500">Alex</span>
                  </span>
                </div>
              </div>
              <p className="h-[40px] text-center text-sm text-stone-500">
                Show who contributed
                <br />
                each piece of content
              </p>
            </div>
          </div>
        </div>
      </div>
    </ContentSlide>
  );
};
