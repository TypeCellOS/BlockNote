import { ArrowRight, ArrowLeft, Database } from "lucide-react";
import { ContentSlide } from "../../_components/ContentSlide";

export const SlideAttributionManager = () => {
  return (
    <ContentSlide title="Attribution Manager" wide>
      <div className="flex h-full items-center justify-center gap-8">
        {/* Left side: Y.js Update and Query Range stacked with arrows */}
        <div className="flex items-center gap-6">
          {/* Boxes column */}
          <div className="flex w-72 flex-col gap-6">
            {/* Y.js Update */}
            <div className="flex flex-col gap-2">
              <div className="text-center text-xs font-bold uppercase tracking-widest text-stone-400">
                Y.js Update
              </div>
              <div className="overflow-hidden rounded-xl border-2 border-purple-300">
                {/* State Vector header */}
                <div className="bg-purple-50 px-4 py-3">
                  <div className="mb-1 flex items-baseline gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-purple-500">
                      State Vector
                    </span>
                    <span className="font-mono text-xs text-purple-400">
                      (LamportTimestamp[])
                    </span>
                  </div>
                  <div className="font-mono text-sm">
                    <span className="text-stone-500">[{"{"}</span>
                    <span className="text-purple-600">clientId</span>
                    <span className="text-stone-500">:</span>{" "}
                    <span className="text-amber-600">4</span>
                    <span className="text-stone-500">{"}"}]</span>
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
              <div className="text-center text-xs font-bold uppercase tracking-widest text-stone-400">
                Query Range
              </div>
              <div className="overflow-hidden rounded-xl border-2 border-amber-400">
                {/* Query input header */}
                <div className="bg-purple-50 px-4 py-3">
                  <div className="font-mono text-sm">
                    <span className="text-purple-600">clientId</span>
                    <span className="text-stone-500">:</span>{" "}
                    <span className="text-amber-600">1 - 3</span>
                  </div>
                </div>
                {/* Results */}
                <div className="border-t border-amber-200 bg-amber-50 px-4 py-3">
                  <div className="mb-1.5 text-xs font-bold uppercase tracking-wider text-amber-500">
                    Results
                  </div>
                  <div className="space-y-1.5 font-mono text-sm">
                    <div className="rounded border border-amber-200 bg-white px-2 py-1">
                      <span className="text-amber-600">userId:</span>{" "}
                      <span className="text-stone-600">"nick"</span>
                      <span className="text-stone-400">,</span>{" "}
                      <span className="text-amber-600">ts:</span>{" "}
                      <span className="text-stone-600">1001</span>
                    </div>
                    <div className="rounded border border-amber-200 bg-white px-2 py-1">
                      <span className="text-amber-600">userId:</span>{" "}
                      <span className="text-stone-600">"nick"</span>
                      <span className="text-stone-400">,</span>{" "}
                      <span className="text-amber-600">ts:</span>{" "}
                      <span className="text-stone-600">1002</span>
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
        <div className="flex h-full items-center py-8">
          <div className="flex h-full flex-col rounded-xl border-2 border-green-400 bg-green-50 px-8 py-6">
            <div className="flex items-center justify-center gap-2">
              <Database size={24} className="text-green-600" />
              <span className="text-xl font-semibold text-green-700">
                Attribution Manager
              </span>
            </div>

            <div className="mt-4 flex flex-1 flex-col border-t border-green-200 pt-4">
              <div className="mb-3 text-center text-xs font-bold uppercase tracking-wider text-green-500">
                LamportTimestamp → Metadata
              </div>
              <div className="flex flex-1 flex-col justify-center space-y-2">
                <div className="rounded border border-green-200 bg-white px-4 py-2">
                  <div className="flex items-center gap-3 font-mono text-sm">
                    <div className="rounded bg-purple-100 px-2 py-1 text-purple-700">
                      {"{"}clientId: 1{"}"}
                    </div>
                    <span className="text-green-500">→</span>
                    <span className="text-stone-600">
                      {"{"}userId: &quot;nick&quot;, ts: 1001{"}"}
                    </span>
                  </div>
                </div>
                <div className="rounded border border-green-200 bg-white px-4 py-2">
                  <div className="flex items-center gap-3 font-mono text-sm">
                    <div className="rounded bg-purple-100 px-2 py-1 text-purple-700">
                      {"{"}clientId: 2{"}"}
                    </div>
                    <span className="text-green-500">→</span>
                    <span className="text-stone-600">
                      {"{"}userId: &quot;nick&quot;, ts: 1002{"}"}
                    </span>
                  </div>
                </div>
                <div className="rounded border border-green-200 bg-white px-4 py-2">
                  <div className="flex items-center gap-3 font-mono text-sm">
                    <div className="rounded bg-purple-100 px-2 py-1 text-purple-700">
                      {"{"}clientId: 3{"}"}
                    </div>
                    <span className="text-green-500">→</span>
                    <span className="text-stone-600">
                      {"{"}userId: &quot;nick&quot;, ts: 1003{"}"}
                    </span>
                  </div>
                </div>
                <div className="rounded border border-blue-200 bg-blue-50 px-4 py-2">
                  <div className="flex items-center gap-3 font-mono text-sm">
                    <div className="rounded bg-purple-100 px-2 py-1 text-purple-700">
                      {"{"}clientId: 4{"}"}
                    </div>
                    <span className="text-green-500">→</span>
                    <span className="text-blue-600">
                      {"{"}userId: &quot;nick&quot;, ts: 1004{"}"}
                    </span>
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
    </ContentSlide>
  );
};
