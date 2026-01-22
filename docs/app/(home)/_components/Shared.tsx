"use client";
import ThemedImage from "@/components/ThemedImage";
import LogoDark from "@/public/img/logos/banner.dark.svg";
import LogoLight from "@/public/img/logos/banner.svg";
import React from "react";

export const Logo: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <ThemedImage
      src={{ light: LogoLight, dark: LogoDark }}
      alt="BlockNote Logo"
      className={className}
    />
  );
};

interface MockEditorProps {
  variant?: string;
  title?: string;
  body?: React.ReactNode;
  cursorVisible?: boolean;
  aiSelection?: boolean;
  aiPopupVisible?: boolean;
  aiThinking?: boolean;
  className?: string;
}

export const MockEditor: React.FC<MockEditorProps> = ({
  title,
  body,
  cursorVisible,
  aiSelection,
  aiPopupVisible,
  className,
}) => {
  return (
    <div className={`relative w-full overflow-hidden bg-white ${className}`}>
      <div className="flex items-center gap-2 border-b border-gray-100 bg-gray-50 px-4 py-3">
        <div className="flex gap-1.5">
          <div className="h-3 w-3 rounded-full bg-red-400" />
          <div className="h-3 w-3 rounded-full bg-amber-400" />
          <div className="h-3 w-3 rounded-full bg-green-400" />
        </div>
        <div className="ml-4 text-xs font-medium text-gray-400">{title}</div>
      </div>
      <div className="prose min-h-[300px] max-w-none p-8">
        <div className="relative text-stone-600">
          <span
            className={
              aiSelection ? "rounded bg-purple-100 px-0.5 text-purple-900" : ""
            }
          >
            {body}
          </span>
          {cursorVisible && (
            <span className="ml-0.5 inline-block h-5 w-0.5 animate-pulse bg-black align-middle"></span>
          )}

          {aiPopupVisible && (
            <div className="animate-in fade-in zoom-in-95 absolute left-0 top-8 z-10 w-64 rounded-lg border border-purple-100 bg-white p-2 shadow-xl duration-200">
              <div className="mb-2 flex items-center gap-2 px-2 text-xs font-semibold text-purple-600">
                <span>✨ AI Assistant</span>
              </div>
              <div className="space-y-1">
                <div className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm text-gray-700 hover:bg-purple-50">
                  <span>Fix grammar</span>
                </div>
                <div className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm text-gray-700 hover:bg-purple-50">
                  <span>Make shorter</span>
                </div>
                <div className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm text-gray-700 hover:bg-purple-50">
                  <span>Change tone...</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
