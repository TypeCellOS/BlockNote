import React from "react";

// --- Mock Editor Component ---
interface MockEditorProps {
  variant?: string;
  title: string;
  body: string;
  cursorVisible: boolean;
  aiSelection: boolean;
  aiPopupVisible: boolean;
  aiThinking: boolean;
}

export const MockEditor: React.FC<MockEditorProps> = ({
  title,
  body,
  cursorVisible,
  aiSelection,
  aiPopupVisible,
  aiThinking,
}) => {
  return (
    <div className="h-full overflow-hidden rounded-lg border border-stone-200 bg-white text-left shadow-xl">
      <div className="flex items-center gap-2 border-b border-stone-100 p-4">
        <div className="flex gap-1.5">
          <div className="h-3 w-3 rounded-full bg-red-400 opacity-20"></div>
          <div className="h-3 w-3 rounded-full bg-amber-400 opacity-20"></div>
          <div className="h-3 w-3 rounded-full bg-green-400 opacity-20"></div>
        </div>
        <div className="ml-4 truncate text-xs font-medium text-stone-400">
          {title || "Untitled"}
        </div>
      </div>
      <div className="min-h-[300px] p-8 font-serif text-xl leading-relaxed text-stone-800">
        {body}
        {cursorVisible && (
          <span className="ml-0.5 inline-block h-6 w-0.5 animate-pulse bg-blue-500 align-middle"></span>
        )}

        {/* Simulate Selection */}
        {aiSelection && !aiPopupVisible && !aiThinking && (
          <span className="-ml-1 bg-purple-200/50 pl-1"> </span>
        )}

        {/* Simulate AI Popover */}
        {aiPopupVisible && (
          <div className="animate-in fade-in zoom-in-95 absolute left-1/2 top-1/2 z-20 w-64 -translate-x-1/2 -translate-y-1/2 transform rounded-xl border border-purple-100 bg-white p-2 shadow-2xl duration-200">
            <div className="mb-2 flex items-center gap-2 border-b border-stone-100 p-2 pb-3">
              <div className="flex h-5 w-5 items-center justify-center rounded-md bg-purple-100 text-xs text-purple-600">
                ✨
              </div>
              <span className="text-sm font-semibold text-stone-800">
                Ask AI...
              </span>
            </div>
            <div className="space-y-1">
              <div className="cursor-pointer rounded px-2 py-1.5 text-xs text-stone-600 hover:bg-stone-50">
                Improve writing
              </div>
              <div className="cursor-pointer rounded px-2 py-1.5 text-xs text-stone-600 hover:bg-stone-50">
                Fix spelling
              </div>
              <div className="cursor-pointer rounded px-2 py-1.5 text-xs text-stone-600 hover:bg-stone-50">
                Make shorter
              </div>
            </div>
          </div>
        )}

        {/* Simulate AI Thinking State */}
        {aiThinking && (
          <div className="absolute left-1/2 top-1/2 z-20 flex -translate-x-1/2 -translate-y-1/2 transform items-center gap-3 rounded-xl border border-purple-100 bg-white/90 px-4 py-3 shadow-lg backdrop-blur">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-purple-500 border-t-transparent"></div>
            <span className="text-sm font-medium text-stone-600">
              Rewriting...
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

// --- Logo Component ---
export const Logo: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M4 4C4 2.89543 4.89543 2 6 2H18C19.1046 2 20 2.89543 20 4V20C20 21.1046 19.1046 22 18 22H6C4.89543 22 4 21.1046 4 20V4ZM6 4V20H18V4H6ZM12 7C12.5523 7 13 7.44772 13 8V11H16C16.5523 11 17 11.4477 17 12C17 12.5523 16.5523 13 16 13H13V16C13 16.5523 12.5523 17 12 17C11.4477 17 11 16.5523 11 16V13H8C7.44772 13 7 12.5523 7 12C7 11.4477 7.44772 11 8 11H11V8C11 7.44772 11.4477 7 12 7Z" />
  </svg>
);
