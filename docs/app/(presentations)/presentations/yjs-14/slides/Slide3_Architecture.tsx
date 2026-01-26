import { ArrowRight, ArrowUp } from "lucide-react";
import { CenteredSlide } from "../../_components/CenteredSlide";

export const Slide3_Architecture = () => {
  return (
    <CenteredSlide>
      <div className="flex h-full flex-col items-center justify-center gap-2">
        {/* Top: Merged Doc (Diff) */}
        <div className="relative flex h-[220px] w-[200px] flex-col rounded-sm border border-stone-200 bg-white p-6 shadow-md">
          <div className="mb-4 text-center text-[10px] font-bold uppercase tracking-widest text-stone-400">
            Edit view
          </div>
          <p className="font-serif text-lg leading-relaxed text-stone-800">
            Hello{" "}
            <span className="text-red-500 line-through decoration-2">
              world
            </span>{" "}
            <span className="font-medium text-green-600">Brussels</span>!
          </p>
        </div>

        {/* Middle: Arrows */}
        <div className="flex w-[260px] justify-between px-8 text-stone-300">
          <ArrowUp size={32} strokeWidth={1.5} className="rotate-45" />
          <ArrowUp size={32} strokeWidth={1.5} className="-rotate-45" />
        </div>

        {/* Bottom: Base and Branch Docs */}
        <div className="flex items-center gap-8">
          {/* Doc A */}
          <div className="relative flex h-[220px] w-[200px] flex-col rounded-sm border border-stone-200 bg-white p-6 shadow-md">
            <div className="mb-4 text-center text-[10px] font-bold uppercase tracking-widest text-stone-400">
              Base
            </div>
            <p className="font-serif text-lg leading-relaxed text-stone-800">
              Hello world!
            </p>
          </div>

          <ArrowRight size={32} strokeWidth={1.5} className="text-stone-300" />

          {/* Doc B */}
          <div className="relative flex h-[220px] w-[200px] flex-col rounded-sm border border-stone-200 bg-white p-6 shadow-md">
            <div className="mb-4 text-center text-[10px] font-bold uppercase tracking-widest text-stone-400">
              Branch
            </div>
            <p className="font-serif text-lg leading-relaxed text-stone-800">
              Hello Brussels!
            </p>
          </div>
        </div>
      </div>
    </CenteredSlide>
  );
};
