import { Mail } from "lucide-react";
import { CenteredSlide } from "../../_components/CenteredSlide";

export const Slide5_TheEnd = () => {
  return (
    <CenteredSlide>
      <h1 className="mb-6 font-serif text-7xl leading-tight text-stone-900">
        Thank you!
      </h1>

      <div className="mb-12 flex flex-col items-center gap-4 text-3xl text-stone-600">
        <p>
          Yjs 14 preview available under{" "}
          <code className="rounded bg-stone-100 px-2 py-1 font-mono text-stone-800">
            @y/y
          </code>
        </p>
        <p className="text-2xl text-stone-500">
          y-prosemirror and BlockNote updates later this year
        </p>
      </div>

      <div className="flex gap-12 text-3xl text-stone-600">
        <div className="flex items-center gap-3">
          <Mail className="text-purple-600" />
          <a
            href="mailto:team@blocknotejs.org"
            className="transition-colors hover:text-purple-600"
          >
            team@blocknotejs.org
          </a>
        </div>
      </div>
    </CenteredSlide>
  );
};
