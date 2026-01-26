import { ContentSlide } from "../../_components/ContentSlide";

export const Slide2_ClearUp = () => {
  return (
    <ContentSlide title="What we mean (top-down)">
      <div className="space-y-6">
        <ul className="list-disc space-y-4 pl-6 text-lg text-stone-600 marker:text-purple-500">
          <li>Examples of Google Docs</li>
          <li>Use cases</li>
          <li>
            Demo
            <ul className="list-disc space-y-2 pl-6 marker:text-stone-300">
              <li>(Video placeholder?)</li>
            </ul>
          </li>
        </ul>
      </div>
    </ContentSlide>
  );
};
