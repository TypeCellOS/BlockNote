import {
  ArrowLeftRight,
  RefreshCw,
  Pause,
  Play,
  Paintbrush,
} from "lucide-react";
import { ContentSlide } from "../../_components/ContentSlide";

export const SlideYProsemirror = () => {
  return (
    <ContentSlide title="@y/prosemirror: The Bridge" wide>
      <div className="flex h-full flex-col items-center justify-center">
        {/* Unified grid for both rows */}
        <div className="grid grid-cols-3 gap-6">
          {/* Row 1: Y.js Document */}
          <div className="flex h-36 flex-col items-center justify-center rounded-xl border-2 border-purple-400 bg-purple-50 shadow-sm">
            <div className="font-mono text-xl font-semibold text-purple-700">
              Y.js Document
            </div>
            <div className="mt-2 text-sm text-purple-500">Y.Type</div>
          </div>

          {/* Row 1: @y/prosemirror bridge */}
          <div className="flex flex-col items-center justify-center gap-2">
            <div className="rounded-xl border-2 border-dashed border-green-400 bg-green-50 px-6 py-4">
              <div className="flex items-center gap-3">
                <ArrowLeftRight
                  size={28}
                  strokeWidth={2}
                  className="text-green-600"
                />
                <div className="text-center">
                  <div className="font-semibold text-green-700">
                    @y/prosemirror
                  </div>
                  <div className="text-xs text-green-600">
                    bidirectional sync
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-full bg-blue-100 px-4 py-2 text-sm font-medium text-blue-700">
              <RefreshCw size={14} />
              uses getDelta API
            </div>
          </div>

          {/* Row 1: Prosemirror */}
          <div className="flex h-36 flex-col items-center justify-center rounded-xl border-2 border-blue-400 bg-blue-50 shadow-sm">
            <div className="font-mono text-xl font-semibold text-blue-700">
              Prosemirror
            </div>
            <div className="mt-2 text-sm text-blue-500">EditorState</div>
          </div>

          {/* Row 2: Delta-based */}
          <div className="flex flex-col items-center gap-3 rounded-xl border border-cyan-200 bg-cyan-50 p-4">
            <div className="flex gap-1">
              <span className="rounded bg-blue-200 px-2 py-1 text-xs font-medium text-blue-700">
                retain
              </span>
              <span className="rounded bg-green-200 px-2 py-1 text-xs font-medium text-green-700">
                insert
              </span>
              <span className="rounded bg-red-200 px-2 py-1 text-xs font-medium text-red-700">
                delete
              </span>
            </div>
            <div className="text-center text-sm font-medium text-cyan-700">
              Delta-Based Mapping
            </div>
            <div className="text-center text-xs text-cyan-600">
              Prosemirror expresses changes
              <br />
              in a delta-compatible way
            </div>
          </div>

          {/* Row 2: Content Renderer */}
          <div className="flex flex-col items-center gap-3 rounded-xl border border-indigo-200 bg-indigo-50 p-4">
            <Paintbrush size={20} className="text-indigo-600" />
            <div className="text-center text-sm font-medium text-indigo-700">
              Content Renderer
            </div>
            {/* Example with colored background mark */}
            <div className="rounded border border-indigo-100 bg-white px-3 py-2">
              <span className="font-mono text-sm">
                <span className="text-stone-700">Hello </span>
                <span className="rounded bg-blue-200 px-1 text-stone-700">
                  world
                </span>
              </span>
              <div className="mt-1 flex items-center justify-center gap-1 text-xs">
                <span className="h-2 w-2 rounded-full bg-blue-400" />
                <span className="text-stone-500">Jane</span>
              </div>
            </div>
          </div>

          {/* Row 2: Pause/Resume */}
          <div className="flex flex-col items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-center gap-2 text-amber-700">
              <Pause size={20} />
              <span className="text-lg font-medium">/</span>
              <Play size={20} />
            </div>
            <div className="text-center text-sm font-medium text-amber-700">
              Pause & Resume Sync
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              <span className="rounded-full bg-amber-200 px-3 py-1 text-xs text-amber-800">
                suggestion mode
              </span>
              <span className="rounded-full bg-amber-200 px-3 py-1 text-xs text-amber-800">
                diff mode
              </span>
            </div>
          </div>
        </div>
      </div>
    </ContentSlide>
  );
};
