import { ContentSlide } from "../../_components/ContentSlide";

export const AgendaSlide = () => {
  return (
    <ContentSlide title="Overview">
      <ul className="space-y-6 text-3xl text-stone-600">
        <li className="flex items-center gap-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100 text-xl font-bold text-purple-600">
            1
          </span>
          <span>Intro to BlockNote</span>
        </li>
        <li className="flex items-center gap-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100 text-xl font-bold text-purple-600">
            2
          </span>
          <span>Demo</span>
        </li>
        <li className="flex items-center gap-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100 text-xl font-bold text-purple-600">
            3
          </span>
          <span>2025 update</span>
        </li>
        <li className="flex items-center gap-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100 text-xl font-bold text-purple-600">
            4
          </span>
          <span>What's ahead</span>
        </li>
      </ul>
    </ContentSlide>
  );
};
