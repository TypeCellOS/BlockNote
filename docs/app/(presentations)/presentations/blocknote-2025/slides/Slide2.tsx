export const Slide2 = () => {
  return (
    <section data-background-color="#fdfbf7">
      <div className="mx-auto flex h-full w-full max-w-5xl flex-col justify-center px-6 text-left">
        <h2 className="mb-12 font-serif text-4xl text-stone-900">
          Core Pillars
        </h2>

        <div className="grid grid-cols-3 gap-6 text-left">
          {/* Card 1 */}
          <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-lg shadow-stone-200/50">
            <div className="mb-4 text-4xl">✨</div>
            <h3 className="mb-2 font-serif text-xl text-stone-900">
              Notion-Quality UX
            </h3>
            <p className="text-sm leading-relaxed text-stone-500">
              Slash commands, drag-and-drop, and real-time collaboration out of
              the box.
            </p>
          </div>

          {/* Card 2 */}
          <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-lg shadow-stone-200/50">
            <div className="mb-4 text-4xl">🛡️</div>
            <h3 className="mb-2 font-serif text-xl text-stone-900">
              Sovereign Infrastructure
            </h3>
            <p className="text-sm leading-relaxed text-stone-500">
              100% open source and self-hostable. Own your data, extend the
              core.
            </p>
          </div>

          {/* Card 3 */}
          <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-lg shadow-stone-200/50">
            <div className="mb-4 text-4xl">🧠</div>
            <h3 className="mb-2 font-serif text-xl text-stone-900">
              Intelligence You Own
            </h3>
            <p className="text-sm leading-relaxed text-stone-500">
              Add AI features like autocomplete and rewriting without leaking
              data.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
