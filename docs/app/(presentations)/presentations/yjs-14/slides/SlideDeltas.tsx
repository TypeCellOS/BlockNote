import { ArrowRight } from "lucide-react";
import { ContentSlide } from "../../_components/ContentSlide";

export const SlideDeltas = () => {
  return (
    <ContentSlide title="Deltas: A Universal Change Format" wide>
      <div className="flex h-full items-center justify-center gap-12">
        {/* Left side: Example */}
        <div className="flex flex-col items-center justify-center gap-8">
          {/* Visual explanation */}
          <div className="flex items-center gap-6">
            {/* Starting state */}
            <div className="flex flex-col items-center gap-3">
              <div className="text-sm font-bold uppercase tracking-widest text-stone-600">
                Start
              </div>
              <div className="rounded-lg border border-stone-200 bg-white px-6 py-4 font-mono text-2xl shadow-sm">
                <span className="text-stone-800">hello world</span>
              </div>
            </div>

            <ArrowRight
              size={28}
              strokeWidth={1.5}
              className="text-stone-300"
            />

            {/* Final state */}
            <div className="flex flex-col items-center gap-3">
              <div className="text-sm font-bold uppercase tracking-widest text-stone-600">
                Result
              </div>
              <div className="min-w-[160px] rounded-lg border border-stone-200 bg-white px-6 py-4 text-center font-mono text-2xl shadow-sm">
                <span className="text-stone-800">hello</span>
                <span className="text-green-600">!</span>
              </div>
            </div>
          </div>

          {/* Delta operations visualization */}
          <div className="mt-10 flex flex-col items-center gap-6">
            <div className="flex items-center gap-4">
              {/* Step 1: Retain */}
              <div className="flex flex-col items-center gap-2">
                <div className="rounded-full bg-blue-100 px-4 py-2 text-sm font-medium text-blue-700">
                  retain(5)
                </div>
                <div className="rounded border border-stone-100 bg-stone-50 px-4 py-2 font-mono text-lg">
                  <span className="text-blue-600 underline decoration-blue-400 decoration-2 underline-offset-4">
                    hello
                  </span>
                  <span className="border-l-2 border-blue-500" />
                  <span className="text-stone-400"> world</span>
                </div>
                <p className="text-xs text-stone-500">skip 5 characters</p>
              </div>

              <ArrowRight
                size={20}
                strokeWidth={1.5}
                className="text-stone-300"
              />

              {/* Step 2: Delete */}
              <div className="flex flex-col items-center gap-2">
                <div className="rounded-full bg-red-100 px-4 py-2 text-sm font-medium text-red-700">
                  delete(6)
                </div>
                <div className="rounded border border-stone-100 bg-stone-50 px-4 py-2 font-mono text-lg">
                  <span className="text-stone-800">hello</span>
                  <span className="border-l-2 border-red-500" />
                  <span className="text-red-400 line-through"> world</span>
                </div>
                <p className="text-xs text-stone-500">remove 6 characters</p>
              </div>

              <ArrowRight
                size={20}
                strokeWidth={1.5}
                className="text-stone-300"
              />

              {/* Step 3: Insert */}
              <div className="flex flex-col items-center gap-2">
                <div className="rounded-full bg-green-100 px-4 py-2 text-sm font-medium text-green-700">
                  insert(&apos;!&apos;)
                </div>
                <div className="rounded border border-stone-100 bg-stone-50 px-4 py-2 font-mono text-lg">
                  <span className="text-stone-800">hello</span>
                  <span className="border-l-2 border-green-500" />
                  <span className="font-medium text-green-600">!</span>
                </div>
                <p className="text-xs text-stone-500">insert at cursor</p>
              </div>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="h-64 w-px bg-stone-200" />

        {/* Right side: What deltas can do */}
        <div className="flex flex-col gap-6">
          <h3 className="text-lg font-semibold text-stone-700">
            Deltas can...
          </h3>
          <ul className="flex flex-col gap-4 text-xl text-stone-600">
            <li className="flex items-start gap-3">
              <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-purple-400" />
              <span>be diffed</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-purple-400" />
              <span>be merged</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-purple-400" />
              <span>describe changes</span>
            </li>
          </ul>
        </div>
      </div>
    </ContentSlide>
  );
};
