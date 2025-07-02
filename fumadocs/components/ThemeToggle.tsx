"use client";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "fumadocs-ui/components/ui/popover";
import { useTheme } from "next-themes";

type Theme = "light" | "dark" | "system";

function ThemeToggleDropdownItem(props: {
  theme: Theme;
  currentTheme: Theme;
  setCurrentTheme: () => void;
}) {
  return (
    <p
      onClick={props.setCurrentTheme}
      className={`hover:text-fd-foreground cursor-pointer select-none text-sm no-underline transition ${props.theme === props.currentTheme ? "text-fd-foreground" : "text-fd-muted-foreground"}`}
    >
      {props.theme.charAt(0).toUpperCase() + props.theme.slice(1)}
    </p>
  );
}

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <p className="text-fd-muted-foreground hover:text-fd-foreground cursor-pointer select-none text-sm no-underline transition">
          {theme ? theme.charAt(0).toUpperCase() + theme.slice(1) : "System"}
        </p>
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="start"
        className="flex min-w-0 flex-col gap-2"
      >
        <ThemeToggleDropdownItem
          theme="light"
          currentTheme={(theme || "system") as Theme}
          setCurrentTheme={() => setTheme("light")}
        />
        <ThemeToggleDropdownItem
          theme="dark"
          currentTheme={(theme || "system") as Theme}
          setCurrentTheme={() => setTheme("dark")}
        />
        <ThemeToggleDropdownItem
          theme="system"
          currentTheme={(theme || "system") as Theme}
          setCurrentTheme={() => setTheme("system")}
        />
      </PopoverContent>
    </Popover>
  );
}
