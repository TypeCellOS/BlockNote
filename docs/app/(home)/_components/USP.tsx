import { SpotlightCard } from "./SpotlightCard";

export const USP = () => {
  return (
    <section className="bg-white/50 py-24 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto mb-20 max-w-2xl text-center">
          <h2 className="mb-6 font-serif text-4xl text-stone-900">
            ?? The editor you'd build, if you had the time.
          </h2>
          <p className="text-lg text-stone-500">
            BlockNote combines a premium editing experience with the flexibility
            of open standards. Zero compromise.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          <SpotlightCard className="group p-8 shadow-xl shadow-stone-200/50">
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl border border-purple-100 bg-purple-50 text-2xl text-purple-600 transition-transform duration-500 group-hover:scale-110">
              ✨
            </div>
            <h3 className="mb-3 font-serif text-2xl text-stone-900">
              ?? Notion-Quality UX
            </h3>
            <p className="relative z-10 mb-6 text-stone-500">
              Give your users the modern, block-based experience they expect.
              Slash commands, drag-and-drop, and real-time collaboration.
            </p>
            <div className="rounded-lg border border-stone-100 bg-stone-50 p-4 font-mono text-xs text-stone-400">
              /image
              <br />
              <span className="text-purple-500">Uploading...</span>
            </div>
          </SpotlightCard>

          <SpotlightCard className="group p-8 shadow-xl shadow-stone-200/50">
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-2xl text-blue-600 transition-transform duration-500 group-hover:scale-110">
              🛡️
            </div>
            <h3 className="mb-3 font-serif text-2xl text-stone-900">
              ?? Sovereign Infrastructure
            </h3>
            <p className="relative z-10 mb-6 text-stone-500">
              ?? 100% open source and self-hostable. Own your data, extend the
              core, and never worry about platform risk.
            </p>
            <div className="flex gap-2 text-[10px] font-bold uppercase tracking-wider text-stone-400">
              <span className="rounded bg-blue-100 px-2 py-1 text-blue-700">
                MIT / MPL
              </span>
              <span className="rounded bg-stone-100 px-2 py-1 text-stone-600">
                Local-First
              </span>
            </div>
          </SpotlightCard>

          <SpotlightCard className="group p-8 shadow-xl shadow-stone-200/50">
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl border border-amber-100 bg-amber-50 text-2xl text-amber-600 transition-transform duration-500 group-hover:scale-110">
              🧠
            </div>
            <h3 className="mb-3 font-serif text-2xl text-stone-900">
              ?? Intelligence You Own
            </h3>
            <p className="relative z-10 mb-6 text-stone-500">
              Add AI features like autocomplete and rewriting without leaking
              data. Bring your own model, run it anywhere.
            </p>
            <div className="flex justify-center gap-2 rounded-lg border border-stone-100 bg-stone-50 p-2">
              <div className="h-2 w-2 rounded-full bg-stone-300"></div>
              <div className="h-2 w-16 rounded-full bg-stone-200"></div>
              <div className="h-2 w-4 rounded-full bg-amber-200"></div>
            </div>
          </SpotlightCard>
        </div>
      </div>
    </section>
  );
};
