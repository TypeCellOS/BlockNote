import { ArrowRight, ArrowDown } from "lucide-react";
import { ContentSlide } from "../../_components/ContentSlide";

export const SlideUnifiedYType = () => {
  return (
    <ContentSlide title="Unified Y.Type" wide>
      <div className="flex h-full items-center justify-center gap-16">
        {/* Left side: XML-like representations as table */}
        <div className="flex flex-col items-center gap-4">
          <div className="text-sm font-bold uppercase tracking-widest text-stone-600">
            Mapping to XML
          </div>
          {/* Y.Text */}
          <div className="flex items-center gap-5">
            <div className="w-40 shrink-0 rounded-lg border-2 border-cyan-300 bg-cyan-50 px-4 py-2 text-center font-mono text-base font-semibold text-cyan-700">
              Y.Text
            </div>
            <code className="w-72 whitespace-nowrap rounded-lg bg-stone-800 px-5 py-2.5 font-mono text-base">
              <span className="text-stone-400">{"<>"}</span>
              <span className="text-amber-300">text content</span>
              <span className="text-stone-400">{"</>"}</span>
            </code>
          </div>

          {/* Y.Array */}
          <div className="flex items-center gap-5">
            <div className="w-40 shrink-0 rounded-lg border-2 border-blue-300 bg-blue-50 px-4 py-2 text-center font-mono text-base font-semibold text-blue-700">
              Y.Array
            </div>
            <code className="w-72 whitespace-nowrap rounded-lg bg-stone-800 px-5 py-2.5 font-mono text-base">
              <span className="text-stone-400">{"<>"}</span>
              <span className="text-sky-400">{"<item />"}</span>
              <span className="text-sky-400">{"<item />"}</span>
              <span className="text-stone-400">{"</>"}</span>
            </code>
          </div>

          {/* Y.Map */}
          <div className="flex items-center gap-5">
            <div className="w-40 shrink-0 rounded-lg border-2 border-amber-300 bg-amber-50 px-4 py-2 text-center font-mono text-base font-semibold text-amber-700">
              Y.Map
            </div>
            <code className="w-72 whitespace-nowrap rounded-lg bg-stone-800 px-5 py-2.5 font-mono text-base">
              <span className="text-stone-400">{"<"}</span>
              <span className="text-sky-400">map</span>
              <span className="text-stone-400"> </span>
              <span className="text-violet-400">key</span>
              <span className="text-stone-400">=</span>
              <span className="text-amber-300">"value"</span>
              <span className="text-stone-400">{" />"}</span>
            </code>
          </div>

          {/* Y.XmlElement */}
          <div className="flex items-center gap-5">
            <div className="w-40 shrink-0 rounded-lg border-2 border-rose-300 bg-rose-50 px-4 py-2 text-center font-mono text-base font-semibold text-rose-700">
              Y.XmlElement
            </div>
            <code className="w-72 whitespace-nowrap rounded-lg bg-stone-800 px-5 py-2.5 font-mono text-base">
              <span className="text-stone-400">{"<"}</span>
              <span className="text-sky-400">name</span>
              <span className="text-stone-400"> </span>
              <span className="text-violet-400">key</span>
              <span className="text-stone-400">=</span>
              <span className="text-amber-300">"val"</span>
              <span className="text-stone-400">{">"}</span>
              <span className="text-stone-500">...</span>
              <span className="text-stone-400">{"</"}</span>
              <span className="text-sky-400">name</span>
              <span className="text-stone-400">{">"}</span>
            </code>
          </div>
        </div>

        {/* Vertical divider */}
        <div className="h-80 w-px bg-stone-200" />

        {/* Right side: Before -> After stacked */}
        <div className="flex flex-col items-center gap-8">
          {/* Before: Multiple fragmented types (2x2 grid) */}
          <div className="flex flex-col items-center gap-4">
            <div className="text-sm font-bold uppercase tracking-widest text-stone-600">
              Before (v13)
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl border-2 border-cyan-300 bg-cyan-50 px-6 py-3 text-center">
                <div className="font-mono text-xl font-semibold text-cyan-700">
                  Y.Text
                </div>
              </div>
              <div className="rounded-xl border-2 border-blue-300 bg-blue-50 px-6 py-3 text-center">
                <div className="font-mono text-xl font-semibold text-blue-700">
                  Y.Array
                </div>
              </div>
              <div className="rounded-xl border-2 border-amber-300 bg-amber-50 px-6 py-3 text-center">
                <div className="font-mono text-xl font-semibold text-amber-700">
                  Y.Map
                </div>
              </div>
              <div className="rounded-xl border-2 border-rose-300 bg-rose-50 px-6 py-3 text-center">
                <div className="font-mono text-xl font-semibold text-rose-700">
                  Y.XmlElement
                </div>
              </div>
            </div>
          </div>

          <ArrowDown size={32} strokeWidth={1.5} className="text-stone-300" />

          {/* After: Unified Y.Type + Schema */}
          <div className="flex flex-col items-center gap-4">
            <div className="text-sm font-bold uppercase tracking-widest text-stone-600">
              After (v14)
            </div>
            <div className="flex items-center gap-5">
              <div className="rounded-xl border-2 border-green-400 bg-green-50 px-10 py-5 text-center">
                <div className="font-mono text-3xl font-bold text-green-700">
                  Y.Type
                </div>
              </div>

              <div className="text-3xl font-light text-stone-300">+</div>

              <div className="rounded-xl border-2 border-indigo-400 bg-indigo-50 px-10 py-5 text-center">
                <div className="font-mono text-3xl font-bold text-indigo-700">
                  Schema
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ContentSlide>
  );
};
