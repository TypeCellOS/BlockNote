import { ContentSlide } from "../../_components/ContentSlide";

export const SlideOverview = () => {
  return (
    <ContentSlide title="Overview">
      <div className="space-y-6">
        <ul className="list-disc space-y-6 pl-6 text-3xl text-stone-600 marker:text-purple-500">
          <li>Introduction</li>
          <li>Demo</li>
          <li>Architectural overview</li>
          <li>Updates in Yjs, y-prosemirror and BlockNote</li>
          <li>Looking forward</li>
        </ul>
      </div>
    </ContentSlide>
  );
};
