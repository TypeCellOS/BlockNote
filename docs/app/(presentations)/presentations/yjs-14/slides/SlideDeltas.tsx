import { ArrowRight, ArrowDown } from "lucide-react";
import { ContentSlide } from "../../_components/ContentSlide";

export const SlideDeltas = () => {
  return (
    <ContentSlide title="Deltas: A Universal Change Format" wide>
      <div className="flex h-full flex-col items-center justify-center gap-8">
        {/* Visual explanation */}
        <div className="flex items-center gap-6">
          {/* Starting state */}
          <div className="flex flex-col items-center gap-3">
            <div className="text-xs font-bold uppercase tracking-widest text-stone-400">
              Start
            </div>
            <div className="rounded-lg border border-stone-200 bg-white px-6 py-4 font-mono text-2xl shadow-sm">
              <span className="text-stone-800">hello world</span>
            </div>
          </div>

          <ArrowRight size={28} strokeWidth={1.5} className="text-stone-300" />

          {/* Final state */}
          <div className="flex flex-col items-center gap-3">
            <div className="text-xs font-bold uppercase tracking-widest text-stone-400">
              Result
            </div>
            <div className="rounded-lg border border-stone-200 bg-white px-6 py-4 font-mono text-2xl shadow-sm">
              <span className="text-stone-800">hello</span>
              <span className="text-green-600">!</span>
            </div>
          </div>
        </div>

        {/* Delta operations visualization */}
        <div className="mt-4 flex flex-col items-center gap-6">
          <ArrowDown size={24} strokeWidth={1.5} className="text-stone-300" />

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

        {/* Key insight */}
        <div className="mt-6 max-w-3xl rounded-lg border border-purple-200 bg-purple-50 px-6 py-4 text-center">
          <p className="text-xl text-stone-700">
            <strong className="font-semibold text-purple-700">
              OT-compatible format
            </strong>{" "}
            — most editors already express changes this way.
            <br />
            <span className="text-lg text-stone-600">
              Y.js binds to deltas, handles conflict resolution automatically.
            </span>
          </p>
        </div>
      </div>
    </ContentSlide>
  );
};
