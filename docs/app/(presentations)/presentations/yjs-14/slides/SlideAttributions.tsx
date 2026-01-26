import { ContentSlide } from "../../_components/ContentSlide";

export const SlideAttributions = () => {
  return (
    <ContentSlide title="Attributions: character-level metadata">
      <div className="space-y-12">
        <div>
          <p className="text-3xl text-stone-600">
            In Yjs, every character is uniquely addressable. With attributions,
            we can attach metadata to specific ranges.
          </p>
        </div>

        <div className="space-y-6">
          <ul className="list-disc space-y-4 pl-8 text-2xl text-stone-600 marker:text-purple-500">
            <li>
              <strong className="font-medium text-stone-800">
                IDMap&lt;ID, metadata&gt;:
              </strong>{" "}
              a new data structure that efficiently maps IDs to attributes
              (metadata).
            </li>
          </ul>
        </div>

        <div className="space-y-6">
          <p className="text-3xl text-stone-600">
            Metadata can be application-defined:
          </p>
          <ul className="list-disc space-y-4 pl-8 text-2xl text-stone-600 marker:text-purple-500">
            <li>Author information</li>
            <li>Timestamps</li>
            <li>Current weather 🌤️</li>
          </ul>
        </div>
      </div>
    </ContentSlide>
  );
};
