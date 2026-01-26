import { CenteredSlide } from "../../_components/CenteredSlide";

export const Slide5_TheEnd = () => {
  return (
    <CenteredSlide>
      <h1 className="mb-6 font-serif text-7xl leading-tight text-stone-900">
        The End
      </h1>
      <div className="max-w-xl text-left">
        <h3 className="mb-4 text-3xl font-bold text-stone-700">Summary</h3>
        <ul className="list-disc space-y-2 pl-6 text-2xl text-stone-600 marker:text-purple-500">
          <li>Current state, when to expect</li>
          <li>Future-facing, what does this enable</li>
        </ul>
      </div>
    </CenteredSlide>
  );
};
