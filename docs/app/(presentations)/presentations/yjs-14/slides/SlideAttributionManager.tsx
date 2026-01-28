import {
  ArrowRight,
  ArrowLeft,
  Database,
  Info,
  FileText,
  Search,
} from "lucide-react";
import { ContentSlide } from "../../_components/ContentSlide";

export const SlideAttributionManager = () => {
  return (
    <ContentSlide title="Attribution Manager" wide>
      <div className="flex items-start justify-center gap-8 pb-24 pt-2">
        {/* Left side: Y.js Update and Query Range stacked with arrows */}
        <div className="flex items-center gap-6">
          {/* Boxes column */}
          <div className="flex w-64 flex-col gap-6">
            {/* Y.js Update */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-widest text-stone-600">
                <FileText size={14} />
                Y.js Update
              </div>
              <div className="overflow-hidden rounded-xl border-2 border-purple-300">
                {/* Content ID header */}
                <div className="flex items-center gap-2 bg-purple-50 px-4 py-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-purple-500">
                    Content ID
                  </span>
                  <div className="rounded border-2 border-blue-300 bg-blue-50 px-3 py-1.5 font-mono text-sm text-purple-700">
                    203
                  </div>
                </div>
                {/* Content */}
                <div className="border-t border-purple-200 bg-blue-50 px-4 py-3">
                  <div className="font-mono text-sm text-blue-700">
                    <span className="text-blue-500">content:</span> "hello!"
                  </div>
                </div>
              </div>
            </div>

            {/* Query Range */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-widest text-stone-600">
                <Search size={14} />
                Query Range
              </div>
              <div className="overflow-hidden rounded-xl border-2 border-amber-400">
                {/* Query input header */}
                <div className="bg-purple-50 px-4 py-3">
                  <div className="flex items-center gap-2 font-mono text-sm">
                    <span className="rounded bg-purple-100 px-2 py-1 text-purple-700">
                      142
                    </span>
                    <span className="text-stone-400">,</span>
                    <span className="rounded bg-purple-100 px-2 py-1 text-purple-700">
                      287
                    </span>
                  </div>
                </div>
                {/* Results */}
                <div className="border-t border-amber-200 bg-amber-50 px-4 py-3">
                  <div className="mb-1.5 text-xs font-bold uppercase tracking-wider text-amber-500">
                    Results
                  </div>
                  <div className="space-y-1.5 font-mono text-sm">
                    <div className="rounded border border-amber-200 bg-white px-2 py-1">
                      <span className="text-stone-600">nick</span>
                      <span className="text-stone-400">,</span>{" "}
                      <span className="text-stone-600">10:01 AM</span>
                    </div>
                    <div className="rounded border border-amber-200 bg-white px-2 py-1">
                      <span className="text-stone-600">nick</span>
                      <span className="text-stone-400">,</span>{" "}
                      <span className="text-stone-600">10:02 AM</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Arrows column */}
          <div className="flex flex-col justify-around self-stretch py-8">
            {/* Insert arrow */}
            <div className="flex flex-col items-center gap-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-purple-500">
                insert
              </span>
              <ArrowRight
                size={32}
                strokeWidth={1.5}
                className="text-purple-400"
              />
            </div>

            {/* Read arrow */}
            <div className="flex flex-col items-center gap-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-amber-500">
                read
              </span>
              <ArrowLeft
                size={32}
                strokeWidth={1.5}
                className="text-amber-400"
              />
            </div>
          </div>
        </div>

        {/* Right side: Attribution Manager */}
        <div className="flex items-center">
          <div className="flex flex-col rounded-xl border-2 border-green-400 bg-green-50 px-6 py-5">
            <div className="flex items-center justify-center gap-2">
              <Database size={24} className="text-green-600" />
              <span className="text-xl font-semibold text-green-700">
                Attribution Manager
              </span>
            </div>

            <div className="mt-4 flex flex-col border-t border-green-200 pt-4">
              <div className="mb-3 text-center font-mono text-sm text-green-600">
                Map&lt;Content ID, Metadata&gt;
              </div>
              <div className="flex flex-col space-y-2">
                {/* Entry 1 */}
                <div className="flex items-center gap-2">
                  <div className="rounded border border-purple-200 bg-purple-50 px-3 py-1.5 font-mono text-sm text-purple-700">
                    142
                  </div>
                  <span className="text-green-500">→</span>
                  <div className="rounded border border-green-200 bg-white px-3 py-1.5 font-mono text-sm text-stone-600">
                    nick, 10:01 AM
                  </div>
                </div>
                {/* Entry 2 */}
                <div className="flex items-center gap-2">
                  <div className="rounded border border-purple-200 bg-purple-50 px-3 py-1.5 font-mono text-sm text-purple-700">
                    287
                  </div>
                  <span className="text-green-500">→</span>
                  <div className="rounded border border-green-200 bg-white px-3 py-1.5 font-mono text-sm text-stone-600">
                    nick, 10:02 AM
                  </div>
                </div>
                {/* Entry 3 */}
                <div className="flex items-center gap-2">
                  <div className="rounded border border-purple-200 bg-purple-50 px-3 py-1.5 font-mono text-sm text-purple-700">
                    156
                  </div>
                  <span className="text-green-500">→</span>
                  <div className="rounded border border-green-200 bg-white px-3 py-1.5 font-mono text-sm text-stone-600">
                    nick, 10:03 AM
                  </div>
                </div>
                {/* Entry 4 - newly inserted */}
                <div className="flex items-center gap-2">
                  <div className="rounded border-2 border-blue-300 bg-blue-50 px-3 py-1.5 font-mono text-sm text-purple-700">
                    203
                  </div>
                  <span className="text-green-500">→</span>
                  <div className="rounded border-2 border-blue-300 bg-blue-50 px-3 py-1.5 font-mono text-sm text-blue-600">
                    nick, 10:04 AM
                  </div>
                </div>
                <div className="text-center text-lg tracking-widest text-stone-400">
                  ...
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Callout */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2">
        <div className="flex items-center gap-3 rounded-lg border border-purple-200 bg-purple-50 px-5 py-3 text-sm text-purple-700">
          <Info size={16} className="shrink-0" />
          <span>
            A <strong>Content ID</strong> is a set of inserted and deleted
            Lamport timestamps that uniquely identify a piece of content
          </span>
        </div>
      </div>
    </ContentSlide>
  );
};
