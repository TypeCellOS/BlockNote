import React from "react";
import { WindowChrome } from "./WindowChrome";

// Content definitions
export type ContentItem =
  | { type: "code"; file: string; code: string }
  | { type: "image"; src: string; alt: string; className?: string }
  | {
      type: "video";
      src: string;
      className?: string; // object-cover etc
    }
  | { type: "component"; component: React.ReactNode; chrome?: boolean }; // fallback

interface FeatureWindowProps {
  content: ContentItem;
  theme?: "light" | "dark";
  className?: string;
}

export const FeatureWindow: React.FC<FeatureWindowProps> = ({
  content,
  theme = "light",
  className = "",
}) => {
  const isDark = theme === "dark";

  // Case 1: Image - often rendered without chrome or full bleed
  if (content.type === "image") {
    return (
      <img
        src={content.src}
        alt={content.alt}
        className={`h-full w-full ${content.className || ""}`}
      />
    );
  }

  // Case 2: Code/Video - usually needs Chrome
  return (
    <div
      className={`relative h-[380px] w-full overflow-hidden ${
        isDark ? "bg-[#0F0F11]" : "bg-white"
      } ${className}`}
    >
      {/* Chrome */}
      <WindowChrome
        title={content.type === "code" ? content.file : undefined}
        theme={theme}
      />

      {/* Content Area */}
      <div className="relative h-[calc(100%-48px)] w-full">
        {content.type === "video" && (
          <video
            src={content.src}
            autoPlay
            loop
            muted
            playsInline
            preload="none"
            className={`h-full w-full ${content.className}`}
          />
        )}
        {content.type === "code" && (
          <div
            className="overflow-x-auto p-6 text-sm [&>pre]:!bg-transparent"
            dangerouslySetInnerHTML={{ __html: content.code }}
          />
        )}
        {content.type === "component" && content.component}
      </div>
    </div>
  );
};
