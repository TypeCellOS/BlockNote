export const Slide3 = () => {
  return (
    <section data-background-color="#fdfbf7">
      <div className="flex flex-col items-center justify-center">
        <h2 className="mb-8 font-serif text-5xl text-stone-900">
          Build your editor today.
        </h2>

        <p className="mb-12 text-xl text-stone-500">
          Join thousands of developers building the next generation of tools.
        </p>

        <div className="flex gap-4">
          <a
            href="https://github.com/TypeCellOS/BlockNote"
            className="rounded-xl bg-stone-900 px-8 py-4 font-medium text-white transition-transform hover:scale-105"
            target="_blank"
          >
            GitHub
          </a>
          <a
            href="/docs"
            className="rounded-xl border border-stone-200 bg-white px-8 py-4 font-medium text-stone-900 shadow-sm transition-transform hover:scale-105 hover:border-purple-300"
          >
            Documentation
          </a>
        </div>
      </div>
    </section>
  );
};
