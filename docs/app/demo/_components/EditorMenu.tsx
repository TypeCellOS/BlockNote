import { Download, PanelRight, Share, User } from "lucide-react";
import { HARDCODED_USERS } from "./utils";

interface EditorMenuProps {
  onExport: (format: "pdf" | "docx" | "odt") => void;
  user: { id: string; username: string; color: string };
  setUser: (user: {
    id: string;
    username: string;
    color: string;
    avatarUrl: string;
  }) => void;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  disabled?: boolean;
}

export function EditorMenu({
  onExport,
  user,
  setUser,
  sidebarOpen,
  onToggleSidebar,
  disabled,
}: EditorMenuProps) {
  return (
    <div className="flex items-center justify-between border-b border-stone-200 bg-stone-50 px-4 py-2">
      <div className="flex gap-1.5">
        <div className="h-3 w-3 rounded-full bg-red-400" />
        <div className="h-3 w-3 rounded-full bg-amber-400" />
        <div className="h-3 w-3 rounded-full bg-green-400" />
      </div>

      <div className="flex items-center gap-2">
        <div
          className={`flex items-center gap-2 rounded-md border border-stone-200 bg-white px-2 py-1 ${disabled ? "opacity-50" : ""}`}
        >
          <User className="h-3 w-3 text-stone-500" />
          <select
            className="w-[100px] bg-transparent text-xs outline-none"
            value={user.id}
            onChange={(e) => {
              const u = HARDCODED_USERS.find((u) => u.id === e.target.value);
              if (u) setUser(u);
            }}
            disabled={disabled}
          >
            {HARDCODED_USERS.map((u) => (
              <option key={u.id} value={u.id}>
                {u.username}
              </option>
            ))}
          </select>
        </div>

        <div className="mx-2 h-4 w-px bg-stone-300" />

        <div
          className={`flex gap-1 ${disabled ? "pointer-events-none opacity-50" : ""}`}
        >
          <button
            className="flex items-center gap-1 rounded-md border border-stone-200 bg-white px-2 py-1 text-xs hover:bg-stone-50"
            onClick={() => {
              navigator.clipboard.writeText(window.location.href);
              alert("URL copied to clipboard!");
            }}
            disabled={disabled}
          >
            <Share className="h-3 w-3" /> Share
          </button>
          <div className="group relative">
            <button
              className="flex items-center gap-1 rounded-md border border-stone-200 bg-white px-2 py-1 text-xs hover:bg-stone-50"
              disabled={disabled}
            >
              <Download className="h-3 w-3" /> Export
            </button>
            <div className="absolute right-0 top-full z-10 hidden w-20 flex-col rounded-md border border-stone-200 bg-white py-1 shadow-md group-hover:flex">
              <button
                className="px-3 py-1 text-left text-xs hover:bg-stone-50"
                onClick={() => onExport("pdf")}
              >
                PDF
              </button>
              <button
                className="px-3 py-1 text-left text-xs hover:bg-stone-50"
                onClick={() => onExport("docx")}
              >
                DOCX
              </button>
              <button
                className="px-3 py-1 text-left text-xs hover:bg-stone-50"
                onClick={() => onExport("odt")}
              >
                ODT
              </button>
            </div>
          </div>
        </div>

        <div className="mx-2 h-4 w-px bg-stone-300" />

        <button
          className={`flex items-center gap-1 rounded-md border border-stone-200 px-2 py-1 text-xs hover:bg-stone-50 ${
            sidebarOpen
              ? "bg-stone-100 text-stone-900"
              : "bg-white text-stone-500"
          } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
          onClick={onToggleSidebar}
          title="Toggle Sidebar"
          disabled={disabled}
        >
          <PanelRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
