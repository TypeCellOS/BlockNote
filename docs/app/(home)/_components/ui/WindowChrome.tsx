import React from "react";

interface WindowChromeProps {
  title?: string;
  theme?: "light" | "dark";
}

export const WindowChrome: React.FC<WindowChromeProps> = ({
  title,
  theme = "light",
}) => {
  const isDark = theme === "dark";
  return (
    <div
      className={`flex items-center justify-between border-b px-4 py-3 ${
        isDark ? "border-white/5 bg-[#18181B]" : "border-gray-100 bg-gray-50"
      }`}
    >
      <div className="flex gap-1.5">
        <div className="h-2.5 w-2.5 rounded-full bg-[#FF5F56]" />
        <div className="h-2.5 w-2.5 rounded-full bg-[#FFBD2E]" />
        <div className="h-2.5 w-2.5 rounded-full bg-[#27C93F]" />
      </div>
      {title && (
        <span
          className={`font-mono text-xs ${
            isDark ? "text-stone-500" : "text-gray-400"
          }`}
        >
          {title}
        </span>
      )}
      <div className="w-4" /> {/* Spacer for centering */}
    </div>
  );
};
