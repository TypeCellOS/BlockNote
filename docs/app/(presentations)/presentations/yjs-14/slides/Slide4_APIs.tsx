import { ContentSlide } from "../../_components/ContentSlide";

export const Slide4_APIs = () => {
  return (
    <ContentSlide title="APIs: What to expect in code">
      <div className="grid grid-cols-2 gap-12">
        <div>
          <h3 className="mb-4 text-3xl font-bold text-stone-700">
            Y.js 14 updates
          </h3>
          <ul className="list-disc space-y-2 pl-6 text-2xl text-stone-600 marker:text-purple-500">
            <li>Deltas</li>
            <li>Unified ytype</li>
            <li>Schema</li>
            <li>Diff docs to get an attribution manager</li>
          </ul>
        </div>
        <div>
          <h3 className="mb-4 text-3xl font-bold text-stone-700">
            y-prosemirror
          </h3>
          <ul className="list-disc space-y-2 pl-6 text-2xl text-stone-600 marker:text-purple-500">
            <li>Pausing &amp; Resuming</li>
            <li>Render changes as marks</li>
            <li>Minimal diffs</li>
          </ul>
          <div className="mt-8">
            <h3 className="mb-4 text-3xl font-bold text-stone-700">
              BlockNote
            </h3>
            <p className="text-xl text-stone-600">
              Higher level APIs (exploratory)
            </p>
          </div>
        </div>
      </div>
    </ContentSlide>
  );
};
