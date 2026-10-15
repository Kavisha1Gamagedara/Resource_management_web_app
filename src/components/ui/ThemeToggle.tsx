"use client";

import React from "react";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/components/providers/ThemeProvider";

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export function ThemeToggle({ className = "", showLabel = false }: ThemeToggleProps) {
  const { theme, toggleTheme, mounted } = useTheme();

  // Guard against hydration mismatch before mount
  if (!mounted) {
    return (
      <div
        className={`h-9 w-9 rounded-xl border border-slate-200 bg-white/50 dark:border-slate-800 dark:bg-slate-900/50 ${className}`}
        aria-hidden="true"
      />
    );
  }

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
      className={`group relative flex items-center justify-center gap-2 rounded-xl border p-2 transition-all duration-200 cursor-pointer select-none active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 ${
        isDark
          ? "border-slate-800 bg-slate-900/80 hover:bg-slate-800 text-amber-400 hover:border-slate-700 shadow-sm"
          : "border-slate-200/90 bg-white hover:bg-slate-100 text-indigo-600 hover:border-slate-300 shadow-xs"
      } ${className}`}
    >
      <div className="relative h-4 w-4 flex items-center justify-center">
        {isDark ? (
          <Sun className="h-4 w-4 transition-transform duration-300 group-hover:rotate-45 text-amber-400" />
        ) : (
          <Moon className="h-4 w-4 transition-transform duration-300 group-hover:-rotate-12 text-indigo-600" />
        )}
      </div>

      {showLabel && (
        <span className="text-xs font-semibold capitalize text-slate-700 dark:text-slate-200">
          {isDark ? "Light Mode" : "Dark Mode"}
        </span>
      )}
    </button>
  );
}
