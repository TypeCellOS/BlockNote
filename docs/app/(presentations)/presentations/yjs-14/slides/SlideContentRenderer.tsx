import {
  ArrowRight,
  ArrowUpDown,
  FileDiff,
  FileText,
  GitCompare,
  Search,
  Users,
} from "lucide-react";
import { ContentSlide } from "../../_components/ContentSlide";

export const SlideContentRenderer = () => {
  return (
    <ContentSlide title="Content Renderer: Views on documents" wide>
      <div className="flex h-full items-center justify-center">
        {/* 3-column layout: Inputs -> Content Renderer -> Outputs */}
        <div className="flex items-center gap-8">
          {/* Left column: Documents A & B */}
          <div className="flex flex-col items-center gap-4">
            {/* Document A */}
            <div className="flex w-[200px] flex-col items-center gap-1">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-stone-600">
                <FileText size={14} />
                Document A
              </div>
              <div className="w-full rounded-lg border-2 border-blue-200 bg-blue-50 px-4 py-2 shadow-sm">
                <div className="flex justify-center whitespace-nowrap font-mono text-base">
                  <span className="text-stone-800">Hello world</span>
                </div>
              </div>
            </div>
            {/* Two-way arrow for comparison */}
            <ArrowUpDown
              size={18}
              strokeWidth={1.5}
              className="hidden text-stone-400"
            />
            {/* Document B */}
            <div className="flex w-[200px] flex-col items-center gap-1">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-stone-600">
                <FileText size={14} />
                Document B
              </div>
              <div className="w-full rounded-lg border-2 border-purple-200 bg-purple-50 px-4 py-2 shadow-sm">
                <div className="flex justify-center whitespace-nowrap font-mono text-base">
                  <span className="text-stone-800">Hello everyone!</span>
                </div>
              </div>
            </div>
          </div>

          {/* Arrow from input */}
          <ArrowRight size={24} strokeWidth={1.5} className="text-stone-300" />

          {/* Center: Content Renderer (shared) */}
          <div className="flex flex-col items-center gap-2">
            <div className="rounded-xl border-2 border-dashed border-amber-400 bg-amber-50 px-8 py-6">
              <div className="flex flex-col items-center gap-2">
                <Search
                  size={28}
                  strokeWidth={1.5}
                  className="text-amber-600"
                />
                <div className="text-center text-xl font-semibold text-amber-700">
                  Content Renderer
                </div>
              </div>
            </div>
            <p className="max-w-[180px] text-center text-xs text-stone-500">
              Hydrate document with context
            </p>
          </div>

          {/* Arrows to outputs */}
          <div className="flex flex-col items-center gap-24">
            <ArrowRight
              size={24}
              strokeWidth={1.5}
              className="-rotate-[30deg] text-stone-300"
            />
            <ArrowRight
              size={24}
              strokeWidth={1.5}
              className="text-stone-300"
            />
            <ArrowRight
              size={24}
              strokeWidth={1.5}
              className="rotate-[30deg] text-stone-300"
            />
          </div>

          {/* Right column: Outputs */}
          <div className="flex flex-col items-start gap-12">
            {/* Output 1: Diff View */}
            <div className="flex w-[260px] flex-col items-center gap-2">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-stone-600">
                <GitCompare size={14} />
                Diff View
              </div>
              <div className="w-full rounded-lg border-2 border-green-200 bg-white px-4 py-2 shadow-md">
                <div className="flex justify-center whitespace-nowrap font-mono text-base">
                  <span className="text-stone-800">Hello&nbsp;</span>
                  <span className="bg-red-100 text-red-600 line-through">
                    world
                  </span>
                  <span className="bg-green-100 text-green-600">everyone!</span>
                </div>
              </div>
              <p className="text-center text-xs text-stone-500">
                Show differences between documents
              </p>
            </div>

            {/* Output 2: Attribution View */}
            <div className="flex w-[260px] flex-col items-center gap-2">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-stone-600">
                <Users size={14} />
                Attribution View
              </div>
              <div className="w-full rounded-lg border-2 border-indigo-200 bg-white px-4 py-2 shadow-md">
                <div className="flex justify-center whitespace-nowrap font-mono text-base">
                  <span className="border-b-2 border-blue-400 text-stone-800">
                    Hello&nbsp;
                  </span>
                  <span className="border-b-2 border-pink-400 text-stone-800">
                    everyone!
                  </span>
                </div>
                <div className="mt-2 flex justify-center gap-3 text-[10px]">
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
              <p className="text-center text-xs text-stone-500">
                Show who wrote each piece
              </p>
            </div>

            {/* Output 3: Diff with Attribution */}
            <div className="flex w-[260px] flex-col items-center gap-2">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-stone-600">
                <FileDiff size={14} />
                Diff + Attribution
              </div>
              <div className="w-full rounded-lg border-2 border-teal-200 bg-white px-4 py-2 shadow-md">
                <div className="flex justify-center whitespace-nowrap font-mono text-base">
                  <span className="text-stone-800">Hello&nbsp;</span>
                  <span className="border-b-2 border-blue-400 bg-red-100 text-red-600 line-through">
                    world
                  </span>
                  <span className="border-b-2 border-pink-400 bg-green-100 text-green-600">
                    everyone!
                  </span>
                </div>
                <div className="mt-2 flex justify-center gap-3 text-[10px]">
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
              <p className="text-center text-xs text-stone-500">
                Diff showing who made each change
              </p>
            </div>
          </div>
        </div>
      </div>
    </ContentSlide>
  );
};
