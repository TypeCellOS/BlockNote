import { ContentSlide } from "../../_components/ContentSlide";

export const SlideGitComparison = () => {
  return (
    <ContentSlide title="Solution: model similar to Git branches">
      <div className="space-y-8">
        <p className="text-3xl text-stone-600">
          Suggestions are like branches, <strong>except:</strong>
        </p>
        <ul className="list-disc space-y-4 pl-8 text-2xl text-stone-600 marker:text-purple-500">
          <li>Changes to the base are always shown live in the branch</li>
          <li>
            Different user modes:
            <ul className="mt-4 list-disc space-y-4 pl-8 marker:text-stone-400">
              <li>
                <strong className="font-medium text-stone-800">
                  Suggestion mode:
                </strong>{" "}
                edits go to fork
              </li>
              <li>
                <strong className="font-medium text-stone-800">
                  Edit mode without suggestions:
                </strong>{" "}
                edits go to base
              </li>
              <li>
                <strong className="font-medium text-stone-800">
                  Edit mode + show suggestions:
                </strong>{" "}
                edits go to ???
              </li>
            </ul>
          </li>
        </ul>
      </div>
    </ContentSlide>
  );
};
