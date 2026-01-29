import React from "react";

export const Letter: React.FC = () => {
  return (
    <section className="relative overflow-hidden bg-[#fdfbf7] py-32">
      {/* Background Decor - Subtle Grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `radial-gradient(#000 1px, transparent 1px)`,
          backgroundSize: `24px 24px`,
        }}
      />

      <div className="relative mx-auto max-w-4xl px-6">
        <div className="relative">
          <div className="mb-16">
            <h2 className="font-serif text-6xl font-medium italic tracking-tight text-stone-900 md:text-8xl">
              Let&apos;s build.
            </h2>
          </div>

          <div className="grid gap-16 md:grid-cols-12">
            <div className="col-span-12 md:col-span-7">
              <div className="prose prose-lg prose-stone max-w-none">
                <p className="font-sans text-xl font-medium leading-relaxed text-stone-900">
                  Building a rich text editor is one of the hardest engineering
                  challenges on the web. It used to take months of specialized
                  work.
                </p>
                <p>
                  We believe that great tools should be{" "}
                  <strong>sovereign</strong> by default. You shouldn&apos;t have
                  to choose between a cohesive UX and owning your
                  infrastructure.
                </p>
                <p>
                  That&apos;s why we built BlockNote. A{" "}
                  <strong>batteries-included</strong> editor that gives you a
                  Notion-quality experience in minutes, while staying grounded
                  in open standards like{" "}
                  <span className="font-semibold text-stone-900">
                    ProseMirror
                  </span>{" "}
                  and <span className="font-semibold text-stone-900">Yjs</span>.
                </p>
              </div>
              <div className="mt-12 text-lg text-stone-600">
                <p>
                  Whether you&apos;re a startup or a public institution, you
                  deserve software that lasts. Join us to{" "}
                  <span className="relative inline-block font-medium text-stone-900">
                    shape the future
                    <svg
                      className="absolute -bottom-1 left-0 w-full text-stone-300"
                      height="6"
                      viewBox="0 0 100 6"
                      preserveAspectRatio="none"
                    >
                      <path
                        d="M0 3 Q 50 6 100 3"
                        stroke="currentColor"
                        strokeWidth="2"
                        fill="none"
                      />
                    </svg>
                  </span>{" "}
                  of the open web.
                </p>
              </div>
            </div>

            <div className="col-span-12 md:col-span-5">
              {/* Floating "Card" for Impact - DARK MODE */}
              <div className="relative h-full transform rounded-2xl bg-stone-900 p-8 text-white shadow-2xl shadow-stone-900/20 transition-transform duration-500 hover:-translate-y-1">
                <div className="flex h-full flex-col justify-between">
                  <div>
                    <h3 className="mb-6 font-sans text-3xl font-bold tracking-tight">
                      Enter BlockNote.
                    </h3>
                    <p className="mb-8 font-sans leading-relaxed text-stone-400">
                      Forget low-level details. Work with a strongly typed API.
                      Get modern UI components out-of-the-box.
                    </p>
                  </div>

                  <div>
                    <div className="mb-6 h-px w-full bg-stone-800" />
                    <div className="flex items-center gap-3">
                      <div className="flex -space-x-2">
                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-500 to-amber-500 ring-2 ring-stone-900" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-stone-500">
                          The Team
                        </span>
                        <span className="font-serif italic text-stone-200">
                          BlockNote Creators
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
