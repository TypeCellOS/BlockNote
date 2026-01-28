import {
  Layers,
  Database,
  Paintbrush,
  ArrowLeftRight,
  Clock,
} from "lucide-react";
import { ContentSlide } from "../../_components/ContentSlide";

export const SlideYjsInternals = () => {
  const topics = [
    {
      icon: Layers,
      title: "Unified Y.Type",
      description: "One type to rule them all + Schema",
      color: "green",
    },
    {
      icon: Database,
      title: "Attribution Manager",
      description: "Track who wrote what",
      color: "purple",
    },
    {
      icon: Paintbrush,
      title: "Content Renderer",
      description: "Diffs & attribution display",
      color: "amber",
    },
    {
      icon: ArrowLeftRight,
      title: "@y/prosemirror",
      description: "The editor bridge, reimagined",
      color: "blue",
    },
  ];

  const colorClasses: Record<
    string,
    { border: string; bg: string; icon: string; title: string; desc: string }
  > = {
    green: {
      border: "border-green-300",
      bg: "bg-green-50",
      icon: "text-green-600",
      title: "text-green-700",
      desc: "text-green-600",
    },
    purple: {
      border: "border-purple-300",
      bg: "bg-purple-50",
      icon: "text-purple-600",
      title: "text-purple-700",
      desc: "text-purple-600",
    },
    amber: {
      border: "border-amber-300",
      bg: "bg-amber-50",
      icon: "text-amber-600",
      title: "text-amber-700",
      desc: "text-amber-600",
    },
    blue: {
      border: "border-blue-300",
      bg: "bg-blue-50",
      icon: "text-blue-600",
      title: "text-blue-700",
      desc: "text-blue-600",
    },
  };

  return (
    <ContentSlide title="What's new in Y.js 14">
      <div className="flex h-full flex-col items-center justify-center gap-8">
        <p className="text-xl text-stone-500">
          A deep dive into the architectural changes
        </p>

        <div className="grid grid-cols-2 gap-6">
          {topics.map((topic, idx) => {
            const colors = colorClasses[topic.color];
            const Icon = topic.icon;
            return (
              <div
                key={idx}
                className={`flex items-center gap-4 rounded-xl border-2 ${colors.border} ${colors.bg} px-6 py-5 transition-transform hover:scale-[1.02]`}
              >
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-lg ${colors.bg}`}
                >
                  <Icon size={28} className={colors.icon} />
                </div>
                <div className="flex-1">
                  <div className={`text-lg font-semibold ${colors.title}`}>
                    {topic.title}
                  </div>
                  <div className={`text-sm ${colors.desc}`}>
                    {topic.description}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Callout */}
        <div className="flex items-center gap-3 rounded-full border border-stone-200 bg-stone-50 px-5 py-2">
          <Clock size={18} className="text-stone-400" />
          <span className="text-sm text-stone-600">
            An update <span className="font-semibold">6 years</span> in the
            making
          </span>
        </div>
      </div>
    </ContentSlide>
  );
};
