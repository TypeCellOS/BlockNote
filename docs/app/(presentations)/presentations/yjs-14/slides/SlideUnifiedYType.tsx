import { ArrowRight, ArrowDown } from "lucide-react";
import { ContentSlide } from "../../_components/ContentSlide";

export const SlideUnifiedYType = () => {
  return (
    <ContentSlide title="Unified Y.Type" wide>
      <div className="flex h-full items-center justify-center gap-16">
        {/* Left side: Before -> After stacked */}
        <div className="flex flex-col items-center gap-8">
          {/* Before: Multiple fragmented types (2x2 grid) */}
          <div className="flex flex-col items-center gap-4">
            <div className="text-sm font-bold uppercase tracking-widest text-stone-400">
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
                  Y.XmlFragment
                </div>
              </div>
            </div>
          </div>

          <ArrowDown size={32} strokeWidth={1.5} className="text-stone-300" />

          {/* After: Unified Y.Type + Schema */}
          <div className="flex flex-col items-center gap-4">
            <div className="text-sm font-bold uppercase tracking-widest text-stone-400">
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

        {/* Vertical divider */}
        <div className="h-80 w-px bg-stone-200" />

        {/* Right side: How Y.Type maps to each type */}
        <div className="flex flex-col gap-4">
          {/* Y.Text */}
          <div className="flex items-center gap-4 rounded-xl border-2 border-cyan-300 bg-cyan-50 px-6 py-4">
            <div className="font-mono text-xl font-semibold text-cyan-700">
              Y.Text
            </div>
            <ArrowRight size={20} className="text-cyan-400" />
            <div className="text-lg text-cyan-600">
              children <span className="text-cyan-400">(string)</span>
            </div>
          </div>

          {/* Y.Array */}
          <div className="flex items-center gap-4 rounded-xl border-2 border-blue-300 bg-blue-50 px-6 py-4">
            <div className="font-mono text-xl font-semibold text-blue-700">
              Y.Array
            </div>
            <ArrowRight size={20} className="text-blue-400" />
            <div className="text-lg text-blue-600">
              children <span className="text-blue-400">(any)</span>
            </div>
          </div>

          {/* Y.Map */}
          <div className="flex items-center gap-4 rounded-xl border-2 border-amber-300 bg-amber-50 px-6 py-4">
            <div className="font-mono text-xl font-semibold text-amber-700">
              Y.Map
            </div>
            <ArrowRight size={20} className="text-amber-400" />
            <div className="text-lg text-amber-600">
              attributes <span className="text-amber-400">(key-value)</span>
            </div>
          </div>

          {/* Y.XmlFragment */}
          <div className="flex items-center gap-4 rounded-xl border-2 border-rose-300 bg-rose-50 px-6 py-4">
            <div className="font-mono text-xl font-semibold text-rose-700">
              Y.XmlFragment
            </div>
            <ArrowRight size={20} className="text-rose-400" />
            <div className="text-lg text-rose-600">
              name, attributes, children
            </div>
          </div>
        </div>
      </div>
    </ContentSlide>
  );
};
