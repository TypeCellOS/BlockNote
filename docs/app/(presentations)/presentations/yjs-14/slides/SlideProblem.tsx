import { ContentSlide } from "../../_components/ContentSlide";

export const SlideProblem = () => {
  return (
    <ContentSlide title="Anti-pattern: Store suggestions directly">
      <div className="grid grid-cols-2 items-center gap-16">
        <div className="space-y-8">
          <p className="text-3xl text-stone-600">Bad idea, because we want:</p>
          <ul className="space-y-6">
            <li className="space-y-2">
              <strong className="block text-2xl font-bold text-stone-800">
                Decentralized permissions
              </strong>
              <p className="text-2xl leading-relaxed text-stone-600">
                Enable suggestion-only users without centrally inspecting every
                update.
              </p>
            </li>
            <li className="space-y-2">
              <strong className="block text-2xl font-bold text-stone-800">
                Decoupling of versions
              </strong>
              <p className="text-2xl leading-relaxed text-stone-600">
                Allow novel collaborative user experiences.
              </p>
            </li>
          </ul>
        </div>

        <div className="flex justify-center">
          <div className="relative flex h-[300px] w-[320px] rotate-3 flex-col rounded-sm border border-stone-200 bg-white p-8 shadow-md transition-transform hover:rotate-0">
            <div className="mb-4 text-center text-xs font-bold uppercase tracking-widest text-red-500">
              Bad Idea
            </div>
            <p className="font-mono text-xl leading-relaxed text-stone-800">
              Hello{" "}
              <span className="text-red-500">&lt;del&gt;world&lt;/del&gt;</span>
              <br />
              <span className="text-green-600">
                &lt;ins&gt;Brussels&lt;/ins&gt;
              </span>
              !
            </p>
          </div>
        </div>
      </div>
    </ContentSlide>
  );
};
