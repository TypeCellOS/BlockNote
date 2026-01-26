import { ContentSlide } from "../../_components/ContentSlide";

export const SlideIntroduction = () => {
  return (
    <ContentSlide title="Introduction">
      <div className="space-y-6">
        <p className="mb-6 text-3xl text-stone-600">
          Adding support to Yjs, y-prosemirror and BlockNote for:
        </p>
        <ul className="list-disc space-y-4 pl-6 text-2xl text-stone-600 marker:text-purple-500">
          <li>
            <strong>Suggestions (track changes):</strong> Proposing changes to a
            document without applying them immediately.
          </li>
          <li>
            <strong>Attributions (detailed version history):</strong> Tracking
            who made what change and when it happened.
          </li>
        </ul>
      </div>
    </ContentSlide>
  );
};
