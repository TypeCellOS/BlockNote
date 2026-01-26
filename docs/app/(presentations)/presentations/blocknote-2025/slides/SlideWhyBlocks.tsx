import { FileCode, FileText } from "lucide-react";

export const SlideWhyBlocks = () => {
  return (
    <section data-background-color="#fdfbf7" className="h-full">
      <div className="mx-auto flex h-full w-full max-w-5xl flex-col px-6 pt-24 text-left">
        <h2 className="mb-12 font-serif text-4xl text-stone-900">
          Why Blocks?
        </h2>

        <div className="flex flex-1 flex-col">
          <div className="grid grid-cols-2 gap-16">
            {/* The Problem */}
            <div className="flex flex-col justify-center space-y-6">
              <div className="group flex items-start gap-6 rounded-xl border border-transparent p-6 transition-all hover:border-stone-200 hover:bg-white/50">
                <div className="text-4xl text-stone-400 transition-colors group-hover:text-stone-600">
                  <FileCode size={40} />
                </div>
                <div>
                  <h3 className="mb-2 font-serif text-3xl text-stone-900">
                    Pure Markdown
                  </h3>
                  <p className="text-2xl leading-relaxed text-stone-500">
                    Too limited for rich content. Content becomes messy.
                  </p>
                </div>
              </div>
              <div className="group flex items-start gap-6 rounded-xl border border-transparent p-6 transition-all hover:border-stone-200 hover:bg-white/50">
                <div className="text-4xl text-stone-400 transition-colors group-hover:text-stone-600">
                  <FileText size={40} />
                </div>
                <div>
                  <h3 className="mb-2 font-serif text-3xl text-stone-900">
                    "Word-style" Editors
                  </h3>
                  <p className="text-2xl leading-relaxed text-stone-500">
                    Too freeform. Hard to maintain consistency or process
                    programmatically.
                  </p>
                </div>
              </div>
            </div>

            {/* The Solution */}
            <div className="flex flex-col justify-center rounded-2xl border border-purple-100 bg-white p-8 shadow-xl shadow-purple-200/50">
              <h3 className="mb-6 font-serif text-4xl text-stone-900">
                <span className="text-purple-600">Blocks</span> are the answer.
              </h3>

              <ul className="space-y-6">
                <li className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-purple-200 bg-purple-100 text-xl text-purple-600">
                    ✨
                  </div>
                  <div>
                    <strong className="mb-1 block text-2xl font-medium text-stone-900">
                      Better UX
                    </strong>
                    <span className="text-xl leading-relaxed text-stone-600">
                      Helps users create structured content naturally. We
                      prioritize{" "}
                      <span className="font-medium text-purple-600">
                        content over form
                      </span>
                      .
                    </span>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue-200 bg-blue-100 text-xl text-blue-600">
                    🛠️
                  </div>
                  <div>
                    <strong className="mb-1 block text-2xl font-medium text-stone-900">
                      Better DX
                    </strong>
                    <span className="text-xl leading-relaxed text-stone-600">
                      Address blocks by{" "}
                      <code className="rounded border border-stone-200 bg-stone-100 px-1.5 py-0.5 font-mono text-lg text-purple-600">
                        id
                      </code>
                      , use strict schemas to create and validate documents.
                    </span>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
